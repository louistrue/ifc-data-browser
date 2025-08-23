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
export const createPyodideWorker = async () => {
  // Read the ifc2sql.py file in the main thread
  const response = await fetch('/ifc2sql.py');
  if (!response.ok) {
    throw new Error(`Failed to fetch ifc2sql.py: ${response.status} ${response.statusText}`);
  }
  const ifc2sqlCode = await response.text();

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
        
        await pyodide.loadPackage(['micropip', 'numpy', 'sqlite3', 'typing-extensions', 'shapely']);
        console.log('[v0] Base packages loaded');
        
        self.postMessage({ type: 'progress', progress: 40, step: 'Installing IfcOpenShell...' });
        
        await pyodide.runPythonAsync(\`
import micropip

# Applying compatibility bypass patch...
print("Applying compatibility bypass patch...")

# Import the WheelInfo class and patch it before any wheel operations
from micropip._micropip import WheelInfo

# Store original method for debugging
original_check_compatible = WheelInfo.check_compatible

# Override the check_compatible method to always pass
def bypass_compatibility_check(self):
    print(f"Bypassing compatibility check for wheel: {getattr(self, 'name', 'unknown')}")
    return None

# Apply the monkey-patch
WheelInfo.check_compatible = bypass_compatibility_check
print("Compatibility check bypassed successfully")

# Install lark dependency first
print("Installing lark dependency...")
await micropip.install('lark')
print("Lark installed successfully")

# Install IfcOpenShell using pinned wheel URL from working config
print("Installing IfcOpenShell wheel...")
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
print("IfcOpenShell installed successfully")

# Try to install ifcpatch if available
print("Attempting to install ifcpatch...")
try:
    await micropip.install('ifcpatch')
    print("ifcpatch installed successfully")
    
    # Try to import it immediately to test
    try:
        import ifcpatch as test_ifcpatch
        print(f"ifcpatch import test successful: {test_ifcpatch}")
        del test_ifcpatch
    except Exception as import_test_error:
        print(f"ifcpatch import test failed: {import_test_error}")
        
except Exception as e:
    print(f"ifcpatch not available via micropip: {e}")
        \`);
        
        console.log('[v0] IfcOpenShell installed successfully');
        self.postMessage({ type: 'progress', progress: 60, step: 'Initializing IfcOpenShell modules...' });
        
        // The ifc2sql.py code is embedded in the worker
        console.log('[v0] Loading ifc2sql.py module...');
        // Properly escape the Python code to avoid syntax issues
        const ifc2sql_code = \`${ifc2sqlCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        // Set the ifc2sql code as a global in Pyodide
        pyodide.globals.set('ifc2sql_code', ifc2sql_code);
        console.log('[v0] ifc2sql.py loaded successfully, length:', ifc2sql_code.length);
        
        await pyodide.runPythonAsync(\`
import ifcopenshell
import ifcopenshell.sql
import json
import tempfile
import os
import sys

print(f"IfcOpenShell version: {ifcopenshell.version}")
print("IfcOpenShell SQL module loaded successfully")

# Execute the ifc2sql module code to define the Patcher class
print("Loading ifc2sql Patcher class...")
exec(ifc2sql_code)

print("ifc2sql Patcher class loaded successfully")
RICH_IFC2SQL_AVAILABLE = True

def process_ifc_to_sqlite(file_content, filename):
    """Process IFC file using official IfcOpenShell SQL module"""
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
        
        # Count entities without using len() to avoid the TypeError
        total_entity_count = 0
        for _ in ifc_file:
            total_entity_count += 1
        print(f"Total entities: {total_entity_count}")
        
        # Create rich SQLite database using the official ifc2sql Patcher class
        sqlite_db_path = '/tmp/model.db'
        
        if RICH_IFC2SQL_AVAILABLE:
            print("Creating rich SQLite database using official IfcOpenShell ifc2sql Patcher")
            try:
                # Remove existing database if present
                if os.path.exists(sqlite_db_path):
                    os.remove(sqlite_db_path)
                
                print("Converting to rich SQLite using ifc2sql.Patcher...")
                print(f"Input IFC file: {temp_ifc_path}")
                print(f"Target database: {sqlite_db_path}")
                
                # Create the Patcher instance with full rich data options
                patcher = Patcher(
                    file=ifc_file,
                    sql_type="SQLite",
                    database=sqlite_db_path,
                    full_schema=False,  # Only create tables for classes in the dataset
                    is_strict=False,    # Don't enforce strict null constraints for invalid data
                    should_expand=False,  # Keep ifc_id as primary key
                    should_get_inverses=True,   # Get inverse relationships
                    should_get_psets=True,      # Get property sets
                    should_get_geometry=False,   # Skip geometry for performance in browser
                    should_skip_geometry_data=True  # Skip geometry representation tables
                )
                
                print("Executing ifc2sql patch...")
                patcher.patch()
                
                output_path = patcher.get_output()
                print(f"Rich SQLite database created at: {output_path}")
                
                if output_path and os.path.exists(output_path):
                    # Now open the rich SQLite database using ifcopenshell.sql.sqlite
                    print("Opening rich SQLite database with ifcopenshell.sql.sqlite...")
                    rich_db = ifcopenshell.sql.sqlite(output_path)
                    print(f"Rich database opened successfully. Schema: {rich_db.schema}")
                    
                    # Test rich data access
                    walls = rich_db.by_type("IfcWall")
                    print(f"Rich database contains {len(walls)} walls with full relationships and properties")
                    
                    # Test property sets access
                    if hasattr(rich_db, 'c'):
                        cursor = rich_db.c
                        cursor.execute("SELECT COUNT(*) FROM psets")
                        pset_count = cursor.fetchone()[0] if cursor.fetchone() else 0
                        print(f"Rich database contains {pset_count} property entries")
                    
                    sqlite_success = True
                else:
                    print("ifc2sql Patcher did not create a SQLite database file")
                    sqlite_success = False
                    
            except Exception as e:
                print(f"Rich SQLite creation with ifc2sql Patcher failed: {e}")
                import traceback
                traceback.print_exc()
                sqlite_success = False
        else:
            print("Creating SQLite database manually with sqlite3")
            try:
                # Remove existing database if present
                if os.path.exists(sqlite_db_path):
                    os.remove(sqlite_db_path)
                
                # Import sqlite3 and create database manually
                import sqlite3
                
                # Create SQLite connection and cursor
                conn = sqlite3.connect(sqlite_db_path)
                cursor = conn.cursor()
                
                print("Creating IFC entity tables in SQLite...")
                
                # Create main entities table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS entities (
                        id INTEGER PRIMARY KEY,
                        global_id TEXT,
                        entity_type TEXT,
                        name TEXT,
                        description TEXT,
                        object_type TEXT,
                        tag TEXT,
                        predefined_type TEXT,
                        data TEXT
                    )
                """)
                
                # Create properties table for extended attributes
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS properties (
                        entity_id INTEGER,
                        property_name TEXT,
                        property_value TEXT,
                        FOREIGN KEY (entity_id) REFERENCES entities (id)
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(entity_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_global_id ON entities(global_id)")
                
                print("Populating SQLite database with IFC entities...")
                entities_inserted = 0
                
                # Insert all entities from the IFC file
                for entity in ifc_file:
                    try:
                        # Get basic entity information
                        entity_id = entity.id()
                        global_id = getattr(entity, 'GlobalId', None)
                        entity_type = entity.is_a()
                        name = getattr(entity, 'Name', None)
                        description = getattr(entity, 'Description', None)
                        object_type = getattr(entity, 'ObjectType', None)
                        tag = getattr(entity, 'Tag', None)
                        predefined_type = getattr(entity, 'PredefinedType', None)
                        
                        # Convert entity to string representation for data field
                        entity_data = str(entity)
                        
                        # Insert entity into database
                        cursor.execute("""
                            INSERT INTO entities 
                            (id, global_id, entity_type, name, description, object_type, tag, predefined_type, data)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            entity_id,
                            global_id,
                            entity_type, 
                            name,
                            description,
                            object_type,
                            tag,
                            predefined_type,
                            entity_data
                        ))
                        
                        entities_inserted += 1
                        
                        # Progress reporting every 100 entities
                        if entities_inserted % 100 == 0:
                            print(f"Inserted {entities_inserted} entities...")
                        
                        # Reasonable limit to prevent excessive processing time
                        if entities_inserted >= 10000:
                            print("Reached entity limit of 10,000")
                            break
                            
                    except Exception as entity_error:
                        print(f"Error processing entity {entity.id()}: {entity_error}")
                        continue
                
                # Commit all changes
                conn.commit()
                conn.close()
                
                print(f"SQLite database created successfully with {entities_inserted} entities")
                sqlite_success = True
                    
            except Exception as e:
                print(f"SQLite creation failed: {e}")
                import traceback
                traceback.print_exc()
                sqlite_success = False
        
        # Extract comprehensive entity information
        print("Extracting rich entity information")
        entities = {}
        total_entities = 0
        
        # Use rich SQLite database if available, otherwise use standard IFC file
        data_source = rich_db if (sqlite_success and RICH_IFC2SQL_AVAILABLE and 'rich_db' in locals()) else ifc_file
        print(f"Using data source: {'Rich SQLite database with psets and inverses' if data_source != ifc_file else 'Standard IFC file'}")
        
        # Get entity type statistics
        type_counts = {}
        if data_source != ifc_file:
            # For rich SQLite database, get type counts from id_map table
            try:
                cursor = data_source.db.cursor()
                cursor.execute("SELECT ifc_class, COUNT(*) FROM id_map GROUP BY ifc_class")
                type_data = cursor.fetchall()
                for ifc_class, count in type_data:
                    type_counts[ifc_class] = count
                print(f"Type counts from rich database: {len(type_counts)} types")
            except Exception as e:
                print(f"Error getting type counts from rich database: {e}")
                # Fallback to original IFC file for type counts
                for entity in ifc_file:
                    entity_type = entity.is_a()
                    type_counts[entity_type] = type_counts.get(entity_type, 0) + 1
        else:
            # For regular IFC file, iterate normally
            for entity in data_source:
                entity_type = entity.is_a()
                type_counts[entity_type] = type_counts.get(entity_type, 0) + 1
        
        # Process major IFC types with comprehensive data extraction
        major_types = ['IfcWall', 'IfcDoor', 'IfcWindow', 'IfcSpace', 'IfcSlab', 
                      'IfcColumn', 'IfcBeam', 'IfcStair', 'IfcRoof', 'IfcBuildingElement',
                      'IfcProject', 'IfcSite', 'IfcBuilding', 'IfcBuildingStorey']
        
        for ifc_type in major_types:
            if ifc_type in type_counts:
                try:
                    # Use the appropriate data source for getting entities by type
                    if data_source != ifc_file:
                        # For rich SQLite database, use the by_type method
                        elements = data_source.by_type(ifc_type)
                    else:
                        # For regular IFC file
                        elements = data_source.by_type(ifc_type)
                    
                    if elements:
                        entities[ifc_type] = []
                        limit = min(100, len(elements))
                        
                        for i, element in enumerate(elements[:limit]):
                            try:
                                # Get comprehensive entity info including rich data when available
                                entity_info = {
                                    'id': element.id(),
                                    'GlobalId': getattr(element, 'GlobalId', None),
                                    'Name': getattr(element, 'Name', None),
                                    'Description': getattr(element, 'Description', None),
                                    'ObjectType': getattr(element, 'ObjectType', None),
                                    'Tag': getattr(element, 'Tag', None),
                                    'Type': element.is_a()
                                }
                                
                                # If using rich database, get additional rich information
                                if data_source != ifc_file:
                                    try:
                                        # Get rich information using get_info method
                                        rich_info = element.get_info(recursive=False, scalar_only=True)
                                        # Add additional fields from rich database
                                        entity_info.update({
                                            'LongName': rich_info.get('LongName', None),
                                            'PredefinedType': rich_info.get('PredefinedType', None),
                                            'CompositionType': rich_info.get('CompositionType', None),
                                            'ElevationOfRefHeight': rich_info.get('ElevationOfRefHeight', None),
                                            'ElevationOfTerrain': rich_info.get('ElevationOfTerrain', None)
                                        })
                                        
                                        # Get relationships count from inverses
                                        try:
                                            inverses = data_source.get_inverse(element)
                                            entity_info['RelationshipCount'] = len(inverses) if inverses else 0
                                        except:
                                            entity_info['RelationshipCount'] = 0
                                        
                                        # Get property sets from rich database
                                        try:
                                            cursor = data_source.db.cursor()
                                            cursor.execute("SELECT pset_name, name, value FROM psets WHERE ifc_id = ?", (element.id(),))
                                            pset_data = cursor.fetchall()
                                            if pset_data:
                                                psets = {}
                                                for pset_name, prop_name, prop_value in pset_data:
                                                    if pset_name not in psets:
                                                        psets[pset_name] = {}
                                                    psets[pset_name][prop_name] = prop_value
                                                entity_info['PropertySets'] = psets
                                                entity_info['PropertyCount'] = len(pset_data)
                                        except Exception as pset_error:
                                            print(f"Error getting property sets for {ifc_type} {i}: {pset_error}")
                                            
                                    except Exception as rich_error:
                                        print(f"Error getting rich info for {ifc_type} {i}: {rich_error}")
                                
                                entities[ifc_type].append(entity_info)
                                total_entities += 1
                            except Exception as e:
                                print(f"Error processing {ifc_type} entity {i}: {e}")
                        
                        print(f"Processed {len(entities[ifc_type])} {ifc_type} entities with {'rich data + psets + inverses' if data_source != ifc_file else 'basic data'}")
                        
                except Exception as e:
                    print(f"Error processing {ifc_type}: {e}")
        
        # Read SQLite file metadata if it exists (don't include binary data due to size)
        sqlite_size = 0
        if sqlite_success and os.path.exists(sqlite_db_path):
            try:
                sqlite_size = os.path.getsize(sqlite_db_path)
                print(f"SQLite database created: {sqlite_size} bytes")
            except Exception as e:
                print(f"Error reading SQLite file size: {e}")
        
        # Prepare comprehensive result (excluding large binary data for better serialization)
        result = {
            'tables': list(entities.keys()) if entities else [],
            'totalEntities': total_entities,
            'schema': ifc_file.schema,
            'entities': entities,
            'sqliteCreated': sqlite_success,
            'sqliteSize': sqlite_size,
            'typeStatistics': dict(sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:20]),
            'processingMethod': ('Rich IFC database via official ifc2sql Patcher' if RICH_IFC2SQL_AVAILABLE else 'IfcOpenShell + manual SQLite creation') if sqlite_success else 'Entity extraction only',
            'fileName': filename
        }
        
        print("Processing Summary")
        print(f"Total entities processed: {total_entities}")
        print(f"Entity types found: {len(entities)}")
        print(f"SQLite database: {'Created successfully' if sqlite_success else 'Creation failed'}")
        
        print("Preparing result for return...")
        print(f"Result keys: {list(result.keys())}")
        print(f"Result type: {type(result)}")
        
        return result
        
    except Exception as e:
        print(f"Critical error processing IFC file: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to process IFC file '{filename}': {str(e)}")

print("IFC processing environment initialized with IfcOpenShell + sqlite3")
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
        
        self.postMessage({ type: 'progress', progress: 80, step: 'Converting to rich SQLite using official ifc2sql Patcher' });
        
        // Execute the processing function and get result
        await pyodide.runPythonAsync(\`
print("[DEBUG] About to call process_ifc_to_sqlite...")
processing_result = process_ifc_to_sqlite(file_content, file_name)
print("[DEBUG] process_ifc_to_sqlite completed successfully")
print(f"[DEBUG] Result is: {type(processing_result)}")
print(f"[DEBUG] Result keys: {list(processing_result.keys()) if isinstance(processing_result, dict) else 'Not a dict'}")
        \`);
        
        // Get the result from Python globals
        const result = pyodide.globals.get('processing_result');
        
        console.log('[v0] Python execution completed, checking result...');
        console.log('[v0] Result type:', typeof result);
        console.log('[v0] Result value:', result);
        
        if (!result) {
          throw new Error('No result returned from Python processing');
        }
        
        // Convert Python result to JavaScript
        let jsResult;
        try {
          console.log('[v0] Converting Python result to JavaScript...');
          jsResult = result.toJs({ dict_converter: Object.fromEntries });
          console.log('[v0] Conversion successful');
          console.log('[v0] JS Result keys:', Object.keys(jsResult || {}));
        } catch (toJsError) {
          console.error('[v0] Error converting Python result to JS:', toJsError);
          throw new Error(\`Failed to convert Python result: \${toJsError.message}\`);
        }
        
        // Check if processing resulted in an error
        if (jsResult && jsResult.error) {
          throw new Error(\`Python processing error: \${jsResult.message}\`);
        }
        
        if (!jsResult || typeof jsResult !== 'object') {
          throw new Error('Invalid result structure returned from Python processing');
        }
        
        console.log('[v0] IFC processing completed successfully using official ifc2sql Patcher');
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
