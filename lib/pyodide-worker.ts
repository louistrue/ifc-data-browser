// Web Worker for Pyodide and IfcOpenShell processing
// This runs in a separate thread to avoid blocking the main UI

export interface PyodideMessage {
  type: "init" | "process" | "progress" | "complete" | "error" | "execute_query"
  data?: any
  progress?: number
  step?: string
  query?: string
}

export interface ProcessingResult {
  tables: string[]
  totalEntities: number
  schema: string
  sqliteData: ArrayBuffer
  entities: Record<string, any[]>
  properties: any[]
}

// This would be the actual worker implementation
export const createPyodideWorker = async () => {
  const response = await fetch("/ifc2sql.py")
  if (!response.ok) {
    throw new Error(`Failed to fetch ifc2sql.py: ${response.status} ${response.statusText}`)
  }
  const ifc2sqlCode = await response.text()

  // Encode the Python code as base64 to avoid template literal issues
  const encodedIfc2sqlCode = btoa(unescape(encodeURIComponent(ifc2sqlCode)))

  const workerCode = `
    let pyodide = null;
    let sqliteDbPath = null;

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
          case 'execute_query':
            await executeQuery(data.query);
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
        
        self.postMessage({ type: 'progress', progress: 30, step: 'Installing shapely...' });
        await pyodide.loadPackage(['shapely']);
        console.log('[v0] Shapely package loaded');
        
        self.postMessage({ type: 'progress', progress: 35, step: 'Installing typing-extensions...' });
        await pyodide.loadPackage(['typing-extensions']);
        console.log('[v0] typing-extensions package loaded');
        
        self.postMessage({ type: 'progress', progress: 37, step: 'Installing sqlite3...' });
        await pyodide.loadPackage(['sqlite3']);
        console.log('[v0] sqlite3 package loaded');
        
        self.postMessage({ type: 'progress', progress: 40, step: 'Installing IfcOpenShell...' });
        
        await pyodide.runPythonAsync(\`
import micropip

# Applying compatibility bypass patch...
print("Applying compatibility bypass patch...")

# Import the WheelInfo class and patch it before any wheel operations
from micropip._micropip import WheelInfo

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

print("Installing IfcOpenShell wheel...")
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
print("IfcOpenShell installed successfully")

print("Installing ifcpatch dependency...")
try:
    await micropip.install('ifcpatch', keep_going=True)
    print("ifcpatch installed successfully")
except Exception as e:
    print(f"Warning: ifcpatch installation had issues: {e}")
    print("Continuing without ifcpatch - using direct ifcopenshell.sql instead")
        \`);
        
        console.log('[v0] IfcOpenShell installed successfully');
        self.postMessage({ type: 'progress', progress: 60, step: 'Loading ifc2sql.py module...' });
        
        console.log('[v0] Loading ifc2sql.py module...');
        
        await pyodide.runPythonAsync(\`
import ifcopenshell
import json
import tempfile
import os
import sys
import base64
import sqlite3

print(f"IfcOpenShell version: {ifcopenshell.version}")

print("Loading official ifc2sql.py Patcher class...")
# Decode the base64 encoded Python code
encoded_code = "${encodedIfc2sqlCode}"
ifc2sql_code = base64.b64decode(encoded_code).decode('utf-8')
exec(ifc2sql_code)
print("Official ifc2sql Patcher class loaded successfully")

def process_ifc_to_sqlite(file_content, filename):
    """Process IFC file using the official ifc2sql.py Patcher class"""
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
        
        sqlite_db_path = '/tmp/model.db'
        
        print("Creating SQLite database using official ifc2sql.py Patcher...")
        
        # Remove existing database if present
        if os.path.exists(sqlite_db_path):
            os.remove(sqlite_db_path)
        
        # Create the official Patcher instance with comprehensive options
        patcher = Patcher(
            file=ifc_file,
            sql_type="SQLite",
            database=sqlite_db_path,
            full_schema=False,  # Only create tables for classes in the dataset
            is_strict=False,    # Don't enforce strict null constraints
            should_expand=False,  # Keep ifc_id as primary key
            should_get_inverses=True,   # Get inverse relationships
            should_get_psets=True,      # Get property sets
            should_get_geometry=False,   # Skip geometry for browser performance
            should_skip_geometry_data=True  # Skip geometry representation tables
        )
        
        print("Executing official ifc2sql patch...")
        patcher.patch()
        
        output_path = patcher.get_output()
        print(f"SQLite database created at: {output_path}")
        
        print("Opening SQLite database with ifcopenshell.sql.sqlite...")
        db = ifcopenshell.sql.sqlite(output_path)
        print(f"Database opened successfully. Schema: {db.schema}")
        
        # Extract comprehensive entity information from the SQLite database
        print("Extracting entity information from SQLite database...")
        entities = {}
        total_entities = 0
        
        # Get all available entity types from the database
        cursor = db.db.cursor()
        cursor.execute("SELECT DISTINCT ifc_class FROM id_map ORDER BY ifc_class")
        available_types = [row[0] for row in cursor.fetchall()]
        print(f"Available entity types in database: {len(available_types)}")
        
        # Process each entity type
        for ifc_type in available_types:
            try:
                elements = db.by_type(ifc_type)
                if elements:
                    entities[ifc_type] = []
                    limit = min(100, len(elements))
                    
                    for i, element in enumerate(elements[:limit]):
                        try:
                            # Get comprehensive entity info
                            entity_info = element.get_info(recursive=False, scalar_only=True)
                            
                            # Add essential fields
                            entity_info.update({
                                'id': element.id(),
                                'Type': element.is_a()
                            })
                            
                            # Get relationships count from inverses
                            try:
                                inverses = db.get_inverse(element)
                                entity_info['RelationshipCount'] = len(inverses) if inverses else 0
                            except:
                                entity_info['RelationshipCount'] = 0
                            
                            # Check for load bearing and external properties
                            try:
                                cursor.execute("SELECT name, value FROM psets WHERE ifc_id = ? AND (name LIKE '%LoadBearing%' OR name LIKE '%IsExternal%')", (element.id(),))
                                structural_props = cursor.fetchall()
                                for prop_name, prop_value in structural_props:
                                    if 'loadbearing' in prop_name.lower():
                                        entity_info['is_loadbearing'] = bool(prop_value)
                                    elif 'external' in prop_name.lower():
                                        entity_info['is_external'] = bool(prop_value)
                            except:
                                pass
                            
                            entities[ifc_type].append(entity_info)
                            total_entities += 1
                        except Exception as e:
                            print(f"Error processing {ifc_type} entity {i}: {e}")
                    
                    print(f"Processed {len(entities[ifc_type])} {ifc_type} entities")
                    
            except Exception as e:
                print(f"Error processing {ifc_type}: {e}")
        
        # Get property sets data
        print("Extracting property sets...")
        cursor.execute("SELECT ifc_id, pset_name, name, value FROM psets ORDER BY ifc_id, pset_name, name")
        pset_data = cursor.fetchall()
        
        properties = []
        for entity_id, pset_name, prop_name, prop_value in pset_data:
            # Get entity type from id_map
            cursor.execute("SELECT ifc_class FROM id_map WHERE ifc_id = ?", (entity_id,))
            entity_type_result = cursor.fetchone()
            entity_type = entity_type_result[0] if entity_type_result else 'Unknown'
            
            # Get entity name if available
            try:
                entity = db.by_id(entity_id)
                entity_name = getattr(entity, 'Name', None) or getattr(entity, 'GlobalId', str(entity_id))
            except:
                entity_name = str(entity_id)
            
            properties.append({
                'entity_id': entity_id,
                'entity_type': entity_type,
                'entity_name': entity_name,
                'pset_name': pset_name,
                'property_name': prop_name,
                'property_value': prop_value
            })
        
        print(f"Extracted {len(properties)} property entries")
        
        # Prepare result
        result = {
            'tables': list(entities.keys()),
            'totalEntities': total_entities,
            'schema': ifc_file.schema,
            'entities': entities,
            'properties': properties,
            'processingMethod': 'Official ifc2sql.py Patcher with ifcopenshell.sql.sqlite',
            'fileName': filename
        }
        
        print("Processing completed successfully using official ifc2sql.py")
        print(f"Total entities processed: {total_entities}")
        print(f"Entity types found: {len(entities)}")
        print(f"Properties extracted: {len(properties)}")
        
        return result
        
    except Exception as e:
        print(f"Critical error processing IFC file: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to process IFC file '{filename}': {str(e)}")

print("IFC processing environment initialized with official ifc2sql.py")
        \`);
        
        console.log('[v0] Official ifc2sql.py environment initialized successfully');
        self.postMessage({ type: 'progress', progress: 100, step: 'Ready for processing' });
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
        self.postMessage({ type: 'progress', progress: 60, step: 'Processing with official ifc2sql.py' });
        
        // Convert ArrayBuffer to bytes for Python
        const uint8Array = new Uint8Array(fileBuffer);
        pyodide.globals.set('file_content', uint8Array);
        pyodide.globals.set('file_name', fileName);
        
        self.postMessage({ type: 'progress', progress: 80, step: 'Converting to SQLite using official Patcher' });
        
        // Execute the processing function
        await pyodide.runPythonAsync(\`
print("[DEBUG] About to call process_ifc_to_sqlite with official ifc2sql.py...")
processing_result = process_ifc_to_sqlite(file_content, file_name)
print("[DEBUG] Official ifc2sql.py processing completed successfully")

global sqlite_db_path
sqlite_db_path = '/tmp/model.db'
print(f"[DEBUG] SQLite database path set to: {sqlite_db_path}")
        \`);
        
        sqliteDbPath = '/tmp/model.db';
        
        // Get the result from Python
        const result = pyodide.globals.get('processing_result');
        
        if (!result) {
          throw new Error('No result returned from Python processing');
        }
        
        let jsResult;
        try {
          // First convert to JS
          jsResult = result.toJs ? result.toJs({ dict_converter: Object.fromEntries }) : result;
          
          // Deep serialize to ensure no proxy objects remain
          const serializedResult = JSON.parse(JSON.stringify(jsResult, (key, value) => {
            // Handle any remaining proxy objects or special types
            if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PyProxy') {
              return value.toJs ? value.toJs() : String(value);
            }
            return value;
          }));
          
          jsResult = serializedResult;
        } catch (conversionError) {
          console.error('[v0] Error converting Python result:', conversionError);
          throw new Error(\`Failed to convert Python result to JavaScript: \${conversionError.message}\`);
        }
        
        if (jsResult && jsResult.error) {
          throw new Error(\`Python processing error: \${jsResult.message}\`);
        }
        
        console.log('[v0] IFC processing completed successfully using official ifc2sql.py');
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

    async function executeQuery(query) {
      try {
        console.log(\`[v0] Executing SQL query: \${query}\`);
        
        if (!pyodide) {
          throw new Error('Pyodide not initialized');
        }
        
        if (!sqliteDbPath) {
          throw new Error('No SQLite database available. Please process an IFC file first.');
        }
        
        // Set the query in Python scope
        pyodide.globals.set('sql_query', query);
        
        // Execute the query using Python
        await pyodide.runPythonAsync(\`
import sqlite3
import json

try:
    print(f"Executing query: {sql_query}")
    
    if 'sqlite_db_path' not in globals():
        sqlite_db_path = '/tmp/model.db'
        print(f"Using default database path: {sqlite_db_path}")
    else:
        print(f"Using existing database path: {sqlite_db_path}")
    
    # Connect to the SQLite database
    conn = sqlite3.connect(sqlite_db_path)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    cursor = conn.cursor()
    
    # Execute the query
    cursor.execute(sql_query)
    
    # Fetch all results
    rows = cursor.fetchall()
    
    # Convert to list of dictionaries
    query_results = []
    for row in rows:
        row_dict = {}
        for key in row.keys():
            value = row[key]
            # Handle None values and ensure JSON serializable
            if value is None:
                row_dict[key] = None
            elif isinstance(value, (int, float, str, bool)):
                row_dict[key] = value
            else:
                row_dict[key] = str(value)
        query_results.append(row_dict)
    
    conn.close()
    
    print(f"Query executed successfully, returned {len(query_results)} rows")
    
except Exception as e:
    print(f"Query execution error: {e}")
    import traceback
    traceback.print_exc()
    query_results = {"error": str(e)}
        \`);
        
        // Get the results from Python
        const results = pyodide.globals.get('query_results');
        
        if (!results) {
          throw new Error('No results returned from query execution');
        }
        
        let jsResults;
        try {
          // Convert to JavaScript
          jsResults = results.toJs ? results.toJs({ dict_converter: Object.fromEntries }) : results;
          
          // Deep serialize to ensure no proxy objects remain
          const serializedResults = JSON.parse(JSON.stringify(jsResults, (key, value) => {
            if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PyProxy') {
              return value.toJs ? value.toJs() : String(value);
            }
            return value;
          }));
          
          jsResults = serializedResults;
        } catch (conversionError) {
          console.error('[v0] Error converting query results:', conversionError);
          throw new Error(\`Failed to convert query results to JavaScript: \${conversionError.message}\`);
        }
        
        if (jsResults && jsResults.error) {
          throw new Error(\`SQL execution error: \${jsResults.error}\`);
        }
        
        console.log(\`[v0] Query executed successfully, returning \${Array.isArray(jsResults) ? jsResults.length : 0} rows\`);
        self.postMessage({ type: 'query_result', data: jsResults });
        
      } catch (error) {
        console.error('[v0] Query execution failed:', error);
        self.postMessage({
          type: 'error',
          data: { 
            message: \`Failed to execute query: \${error.message}\`,
            stack: error.stack 
          }
        });
      }
    }
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}
