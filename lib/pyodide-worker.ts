// Web Worker for Pyodide and IfcOpenShell processing
// This runs in a separate thread to avoid blocking the main UI

export interface PyodideMessage {
  type: "init" | "process" | "progress" | "complete" | "error"
  data?: any
  progress?: number
  step?: string
}

export interface ProcessingResult {
  tables: string[]
  totalEntities: number
  schema: string
  sqliteData: ArrayBuffer
  entities: Record<string, any[]>
}

// This would be the actual worker implementation
export const createPyodideWorker = () => {
  const workerCode = `
    let pyodide = null;
    let pySqliteReady = false;

    self.onmessage = async function(e) {
      const { type, data } = e.data;
      
      try {
        switch (type) {
          case 'init':
            await initializePyodide();
            break;
          case 'process':
            await processIfcFile(data.fileBuffer, data.fileName);
            break;
        }
      } catch (error) {
        console.error('[v0] Worker error:', error);
        self.postMessage({
          type: 'error',
          data: { message: error.message, stack: error.stack }
        });
      }
    };

    async function initializePyodide() {
      try {
        console.log('[v0] Starting Pyodide initialization');
        self.postMessage({ type: 'progress', progress: 5, step: 'Loading Pyodide...' });
        
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
        pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
        });
        
        console.log('[v0] Pyodide loaded successfully');
        self.postMessage({ type: 'progress', progress: 20, step: 'Installing base packages...' });
        
        await pyodide.loadPackage(['micropip', 'numpy']);
        console.log('[v0] Base packages loaded');
        
        self.postMessage({ type: 'progress', progress: 40, step: 'Installing IfcOpenShell...' });
        
        await pyodide.runPythonAsync(\`
import micropip
from micropip._micropip import WheelInfo

# Monkey-patch wheel compatibility check as per working config
WheelInfo.check_compatible = lambda self: None

# Install lark dependency first
await micropip.install('lark')

# Install IfcOpenShell using pinned wheel URL from working config
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
        \`);
        
        console.log('[v0] IfcOpenShell installed successfully');
        self.postMessage({ type: 'progress', progress: 60, step: 'Initializing IfcOpenShell modules...' });
        
        await pyodide.runPythonAsync(\`
import ifcopenshell
import ifcopenshell.sql
import json
import tempfile
import os

print(f"IfcOpenShell version: {ifcopenshell.version}")
print("IfcOpenShell SQL module loaded successfully")

def process_ifc_to_sqlite(file_content, filename):
    """Process IFC file using official IfcOpenShell API with proper ifc2sql functionality"""
    print(f"Processing IFC file: {filename}")
    print(f"File size: {len(file_content)} bytes")
    
    try:
        # Write file content to temporary file
        temp_ifc_path = '/tmp/model.ifc'
        with open(temp_ifc_path, 'wb') as f:
            f.write(bytes(file_content))
        print(f"IFC file written to: {temp_ifc_path}")
        
        # Open IFC file with IfcOpenShell
        print("Opening IFC file with IfcOpenShell...")
        ifc_file = ifcopenshell.open(temp_ifc_path)
        print("IFC file opened successfully")
        print(f"Schema: {ifc_file.schema}")
        print(f"Total entities: {len(ifc_file)}")
        
        # Create SQLite database using the official ifcopenshell.sql module
        sqlite_db_path = '/tmp/model.db'
        print("Creating SQLite database using ifcopenshell.sql")
        
        try:
            # Remove existing database if present
            if os.path.exists(sqlite_db_path):
                os.remove(sqlite_db_path)
            
            # Use the official IfcOpenShell SQL module to create SQLite database
            print("Creating SQLite database with ifcopenshell.sql...")
            sqlite_file = ifcopenshell.sql.sqlite(sqlite_db_path, ifc_file)
            
            # Verify the database was created
            if os.path.exists(sqlite_db_path):
                print("SQLite database created successfully using ifcopenshell.sql")
                sqlite_success = True
            else:
                print("SQLite database file was not created")
                sqlite_success = False
                
        except Exception as e:
            print(f"SQLite creation failed: {e}")
            sqlite_success = False
        
        # Extract comprehensive entity information
        print("Extracting entity information")
        entities = {}
        total_entities = 0
        
        # Get entity type statistics
        type_counts = {}
        for entity in ifc_file:
            entity_type = entity.is_a()
            type_counts[entity_type] = type_counts.get(entity_type, 0) + 1
        
        # Process major IFC types with comprehensive data extraction
        major_types = ['IfcWall', 'IfcDoor', 'IfcWindow', 'IfcSpace', 'IfcSlab', 
                      'IfcColumn', 'IfcBeam', 'IfcStair', 'IfcRoof', 'IfcBuildingElement',
                      'IfcProject', 'IfcSite', 'IfcBuilding', 'IfcBuildingStorey']
        
        for ifc_type in major_types:
            if ifc_type in type_counts:
                try:
                    elements = ifc_file.by_type(ifc_type)
                    if elements:
                        entities[ifc_type] = []
                        limit = min(100, len(elements))
                        
                        for i, element in enumerate(elements[:limit]):
                            try:
                                entity_info = {
                                    'id': element.id(),
                                    'GlobalId': getattr(element, 'GlobalId', None),
                                    'Name': getattr(element, 'Name', None),
                                    'Description': getattr(element, 'Description', None),
                                    'ObjectType': getattr(element, 'ObjectType', None),
                                    'Tag': getattr(element, 'Tag', None),
                                    'Type': element.is_a()
                                }
                                entities[ifc_type].append(entity_info)
                                total_entities += 1
                            except Exception as e:
                                print(f"Error processing {ifc_type} entity {i}: {e}")
                        
                        print(f"Processed {len(entities[ifc_type])} {ifc_type} entities")
                        
                except Exception as e:
                    print(f"Error processing {ifc_type}: {e}")
        
        # Read SQLite file if it exists
        sqlite_data = None
        if sqlite_success and os.path.exists(sqlite_db_path):
            try:
                with open(sqlite_db_path, 'rb') as f:
                    sqlite_data = f.read()
                print(f"SQLite database read: {len(sqlite_data)} bytes")
            except Exception as e:
                print(f"Error reading SQLite file: {e}")
        
        # Prepare comprehensive result
        result = {
            'tables': list(entities.keys()) if entities else [],
            'totalEntities': total_entities,
            'schema': ifc_file.schema,
            'entities': entities,
            'sqliteCreated': sqlite_success,
            'sqliteSize': len(sqlite_data) if sqlite_data else 0,
            'typeStatistics': dict(sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:20]),
            'processingMethod': 'ifcopenshell.sql' if sqlite_success else 'Entity extraction only',
            'fileName': filename
        }
        
        print("Processing Summary")
        print(f"Total entities processed: {total_entities}")
        print(f"Entity types found: {len(entities)}")
        print(f"SQLite database: {'Created successfully' if sqlite_success else 'Creation failed'}")
        
        return result
        
    except Exception as e:
        print(f"Critical error processing IFC file: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to process IFC file '{filename}': {str(e)}")

print("IFC processing environment initialized with official IfcOpenShell API")
        \`);
        
        console.log('[v0] IfcOpenShell environment initialized successfully');
        self.postMessage({ type: 'progress', progress: 100, step: 'IfcOpenShell ready for processing' });
        self.postMessage({ type: 'init', data: { ready: true } });
        
      } catch (error) {
        console.error('[v0] Initialization failed:', error);
        self.postMessage({
          type: 'error',
          data: { 
            message: \`Failed to initialize IfcOpenShell: \${error.message}\`,
            stack: error.stack 
          }
        });
      }
    }

    async function processIfcFile(fileBuffer, fileName) {
      try {
        console.log(\`[v0] Processing file: \${fileName}, size: \${fileBuffer.byteLength} bytes\`);
        self.postMessage({ type: 'progress', progress: 60, step: 'Parsing IFC File with IfcOpenShell' });
        
        // Convert ArrayBuffer to bytes for Python
        const uint8Array = new Uint8Array(fileBuffer);
        pyodide.globals.set('file_content', uint8Array);
        pyodide.globals.set('file_name', fileName);
        
        self.postMessage({ type: 'progress', progress: 80, step: 'Converting to SQLite using official IfcOpenShell API' });
        
        const result = await pyodide.runPythonAsync(\`
try:
    result = process_ifc_to_sqlite(file_content, file_name)
    result
except Exception as e:
    import traceback
    error_info = {
        'error': True,
        'message': str(e),
        'traceback': traceback.format_exc()
    }
    error_info
        \`);
        
        // Convert Python result to JavaScript
        const jsResult = result.toJs({ dict_converter: Object.fromEntries });
        
        // Check if processing resulted in an error
        if (jsResult.error) {
          throw new Error(\`Python processing error: \${jsResult.message}\`);
        }
        
        console.log('[v0] IFC processing completed successfully using official IfcOpenShell');
        self.postMessage({ type: 'progress', progress: 95, step: 'Finalizing Database' });
        self.postMessage({ type: 'progress', progress: 100, step: 'Processing Complete' });
        self.postMessage({ type: 'complete', data: jsResult });
        
      } catch (error) {
        console.error('[v0] File processing failed:', error);
        self.postMessage({
          type: 'error',
          data: { 
            message: \`Failed to process IFC file: \${error.message}\`,
            stack: error.stack 
          }
        });
      }
    }
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}
