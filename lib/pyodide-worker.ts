// Web Worker for Pyodide and IfcOpenShell processing
// This runs in a separate thread to avoid blocking the main UI

export interface PyodideMessage {
  type:
  | "init"
  | "process"
  | "progress"
  | "complete"
  | "error"
  | "execute_query"
  | "export_sqlite"
  | "sqlite_export"
  | "get_schema"
  | "schema_result"
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
    throw new Error('Failed to fetch ifc2sql.py: ' + response.status + ' ' + response.statusText)
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
          case 'export_sqlite':
            await exportSQLiteDatabase();
            break;
          case 'get_schema':
            await extractSchemaDefinition();
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
        console.log('[v0] Starting Pyodide initialization...');
        // Starting Pyodide initialization silently
        self.postMessage({ type: 'progress', progress: 5, step: 'Loading Pyodide...' });
        
        console.log('[v0] Loading Pyodide script...');
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
        
        console.log('[v0] Initializing Pyodide runtime...');
        pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
        });
        console.log('[v0] Pyodide runtime loaded successfully');
        
        // Pyodide loaded successfully
        self.postMessage({ type: 'progress', progress: 20, step: 'Installing base packages...' });
        
        console.log('[v0] Loading base packages (micropip, numpy)...');
        await pyodide.loadPackage(['micropip', 'numpy']);
        console.log('[v0] Base packages loaded successfully');
        
        self.postMessage({ type: 'progress', progress: 30, step: 'Installing shapely...' });
        console.log('[v0] Loading shapely...');
        await pyodide.loadPackage(['shapely']);
        console.log('[v0] Shapely loaded successfully');

        self.postMessage({ type: 'progress', progress: 35, step: 'Installing typing-extensions...' });
        console.log('[v0] Loading typing-extensions...');
        await pyodide.loadPackage(['typing-extensions']);
        console.log('[v0] Typing-extensions loaded successfully');

        self.postMessage({ type: 'progress', progress: 37, step: 'Installing sqlite3...' });
        console.log('[v0] Loading sqlite3...');
        await pyodide.loadPackage(['sqlite3']);
        console.log('[v0] SQLite3 loaded successfully');
        
        self.postMessage({ type: 'progress', progress: 40, step: 'Installing IfcOpenShell...' });
        
        console.log('[v0] Installing IfcOpenShell and dependencies...');
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
        
        // IfcOpenShell installed successfully
        console.log('[v0] IfcOpenShell installation completed');
        self.postMessage({ type: 'progress', progress: 60, step: 'Loading ifc2sql.py module...' });
        
        // Loading ifc2sql.py module silently
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
    
    # Progress callback is already defined globally
    
    try:
        # Phase 1: File loading (0-9%)
        progress_callback(5, "Reading and validating IFC structure...")
        print(f"[PROGRESS] Phase 1: Loading {len(file_content)} bytes into memory")
        
        # Phase 2: IFC parsing (9-18%)
        progress_callback(9, "Reading and validating IFC structure...")
        print("[PROGRESS] Phase 2: Starting IFC parsing with IfcOpenShell")
        
        # Smart loading strategy: file writing is faster for large files!
        file_size_mb = len(file_content) / (1024 * 1024)
        print(f"[PROGRESS] File size: {file_size_mb:.1f}MB")
        
        # For large files (>10MB), file writing is actually faster than string conversion
        # For small files (<10MB), try direct string loading
        if file_size_mb > 10:
            print(f"[PROGRESS] Large file detected ({file_size_mb:.1f}MB) - using optimized file method")
            progress_callback(11, f"Processing large file ({int(file_size_mb)}MB)...")
            
            # Write to file - faster for large files
            temp_ifc_path = '/tmp/model.ifc'
            with open(temp_ifc_path, 'wb') as f:
                f.write(bytes(file_content))
            print(f"[PROGRESS] File written to: {temp_ifc_path}")
            
            progress_callback(14, "Opening IFC file...")
            ifc_file = ifcopenshell.open(temp_ifc_path)
            print(f"[PROGRESS] IFC loaded from file")
            
        else:
            print(f"[PROGRESS] Small file ({file_size_mb:.1f}MB) - trying direct buffer loading")
            
            # Try direct string loading for small files
            try:
                file_data = bytes(file_content).decode('iso-8859-1')
                print(f"[PROGRESS] Text IFC detected: {len(file_data)} characters")
                
                ifc_file = ifcopenshell.file.from_string(file_data)
                print("[PROGRESS] IFC loaded directly from buffer - SUCCESS!")
                
            except Exception as e:
                error_msg = str(e)
                print(f"[PROGRESS] Direct loading failed: {error_msg}")
                
                # Check for specific schema errors
                if 'IFC4X3' in error_msg or 'schema' in error_msg.lower():
                    print(f"[WARNING] Schema compatibility issue: {error_msg}")
                    print("[WARNING] Falling back to file method for better compatibility")
                
                # Fallback: Write to file
                temp_ifc_path = '/tmp/model.ifc'
                with open(temp_ifc_path, 'wb') as f:
                    f.write(bytes(file_content))
                ifc_file = ifcopenshell.open(temp_ifc_path)
                print(f"[PROGRESS] IFC loaded from file")
        print("[PROGRESS] IFC file opened successfully")
        print(f"[PROGRESS] Schema: {ifc_file.schema}")
        
        # Check for unsupported schema versions
        schema_name = ifc_file.schema
        if 'IFC4X3' in schema_name:
            print(f"[WARNING] IFC4X3 schema detected: {schema_name}")
            print("[WARNING] IFC4X3 support is experimental and may cause errors")
            print("[WARNING] Consider using IFC4 or IFC2X3 for better compatibility")
        
        # Skip expensive entity counting - we don't need it
        print("[PROGRESS] IFC file loaded successfully")
        
        sqlite_db_path = '/tmp/model.db'
        
        # Phase 3: Database creation (18-28%)
        progress_callback(18, "Transforming data to database format...")
        print("[PROGRESS] Phase 3: Starting SQLite database creation")
        
        # Remove existing database if present
        if os.path.exists(sqlite_db_path):
            os.remove(sqlite_db_path)
            print(f"[PROGRESS] Removed existing database: {sqlite_db_path}")
        
        # Create the official Patcher instance with comprehensive options
        print("[PROGRESS] Creating Patcher instance...")
        try:
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
        except Exception as patcher_error:
            error_msg = str(patcher_error)
            if 'IFC4X3' in error_msg or 'schema' in error_msg.lower():
                print(f"[ERROR] Schema compatibility issue: {error_msg}")
                print("[ERROR] This IFC file uses a schema version that may not be fully supported")
                print("[ERROR] Please try converting the file to IFC4 or IFC2X3 format")
                print("[ERROR] Alternatively, try using a different IFC processing tool")
                raise Exception(f"Unsupported IFC schema '{schema_name}'. Error: {error_msg}")
            else:
                print(f"[ERROR] Patcher creation failed: {error_msg}")
                raise patcher_error
        
        print("[PROGRESS] Executing official ifc2sql patch...")
        
        # Add progress updates during patcher.patch() - this is the slowest part
        import time
        start_time = time.time()
        
        # Estimate file size for progress messages
        file_size_mb = len(file_content) / (1024 * 1024)
        
        # Start patch in background and report progress
        progress_callback(20, "Transforming data to database format...")
        print("[PROGRESS] Starting patch operation...")
        
        # For very large files, provide periodic updates
        if file_size_mb > 50:
            progress_callback(22, f"Transforming data to database format...")
            print(f"[PROGRESS] Large file detected: {int(file_size_mb)}MB")
        
        # Execute the patch operation
        print("[PROGRESS] Executing patcher.patch() - this is the slowest operation")
        patcher.patch()
        
        patch_time = time.time() - start_time
        print(f"[PROGRESS] Patch completed in {patch_time:.1f} seconds")
        
        if patch_time > 60:
            print(f"[PROGRESS] Long processing time: {patch_time:.1f}s for {int(file_size_mb)}MB file")
        
        output_path = patcher.get_output()
        print(f"[PROGRESS] SQLite database created at: {output_path}")
        
        progress_callback(28, "Transforming data to database format...")
        print("[PROGRESS] Phase 3 complete: Database created successfully")
        
        print("Opening SQLite database with ifcopenshell.sql.sqlite...")
        db = ifcopenshell.sql.sqlite(output_path)
        print(f"Database opened successfully. Schema: {db.schema}")
        
        # Phase 4: Entity extraction (28-66%)
        progress_callback(28, "Transforming data to database format...")
        
        # Extract entity information from major types only for performance
        print("Extracting key entity information...")
        entities = {}
        total_entities = 0

        # Get all available entity types from the database
        cursor = db.db.cursor()
        cursor.execute("SELECT DISTINCT ifc_class FROM id_map ORDER BY ifc_class")
        available_types = [row[0] for row in cursor.fetchall()]

        # Process major architectural/building elements, materials, quantities, and classifications
        # Pre-compile as set for O(1) lookup performance
        major_types = {
            'IfcBuilding', 'IfcBuildingStorey', 'IfcWall', 'IfcSlab', 'IfcColumn', 'IfcBeam', 'IfcDoor', 'IfcWindow', 'IfcFurniture', 'IfcSpace',
            'IfcMaterial', 'IfcMaterialConstituent', 'IfcMaterialConstituentSet', 'IfcMaterialLayer', 'IfcMaterialLayerSet',
            'IfcQuantityLength', 'IfcQuantityVolume', 'IfcQuantityArea', 'IfcQuantityCount', 'IfcQuantityWeight', 'IfcPhysicalComplexQuantity',
            'IfcClassification', 'IfcClassificationReference', 'IfcRelAssociatesMaterial', 'IfcMaterialDefinition'
        }
        types_to_process = [t for t in available_types if t in major_types]

        print(f"Processing {len(types_to_process)} major entity types")
        
        # Pre-compile common attributes list for performance
        common_attrs = ['ObjectType', 'Tag', 'PredefinedType', 'Description', 'LongName']

        # Process each major entity type with progress reporting
        for type_idx, ifc_type in enumerate(types_to_process):
            try:
                elements = db.by_type(ifc_type)
                if elements:
                    entities[ifc_type] = []
                    total_elements = len(elements)
                    
                    # Report progress for this entity type
                    progress_percent = 28 + (38 * type_idx / len(types_to_process))
                    progress_callback(progress_percent, "Transforming data to database format...")
                    print(f"[PROGRESS] Entity extraction: {progress_percent:.1f}% - Processing {ifc_type}")
                    
                    # Process elements in batches for progress updates
                    batch_size = 50
                    for batch_start in range(0, total_elements, batch_size):
                        batch_end = min(batch_start + batch_size, total_elements)
                        batch_elements = elements[batch_start:batch_end]
                        
                        for element in batch_elements:
                            try:
                                # Optimized: Use direct attribute access instead of get_info() for speed
                                # Cache element properties to avoid repeated calls
                                element_id = element.id()
                                element_type = element.is_a()
                                
                                # Start with essential fields using direct access
                                entity_info = {
                                    'id': element_id,
                                    'Type': element_type,
                                    'Name': getattr(element, 'Name', None) or str(element_id)
                                }

                                # Add GlobalId if available
                                if hasattr(element, 'GlobalId'):
                                    entity_info['GlobalId'] = element.GlobalId

                                # Add common attributes efficiently
                                for attr_name in common_attrs:
                                    if hasattr(element, attr_name):
                                        try:
                                            attr_value = getattr(element, attr_name)
                                            if attr_value is not None:
                                                entity_info[attr_name] = attr_value
                                        except:
                                            pass

                                # Enhanced processing for complex IFC relationships (optimized)
                                try:
                                    attr_count = element.attribute_count()
                                    
                                    # Process only critical attributes for performance
                                    critical_attrs = ['ObjectPlacement', 'Representation', 'OwnerHistory']
                                    
                                    for i in range(attr_count):
                                        try:
                                            attr = element.attribute_by_index(i)
                                            attr_name = attr.name()

                                            # Only process critical attributes to avoid slowdown
                                            if attr_name in critical_attrs:
                                                raw_value = element[i]
                                                if raw_value is not None and hasattr(raw_value, 'id') and hasattr(raw_value, 'is_a'):
                                                    # Simplified entity reference for performance
                                                    entity_ref = {
                                                        'id': raw_value.id(),
                                                        'type': raw_value.is_a(),
                                                        'name': getattr(raw_value, 'Name', None) or str(raw_value.id())
                                                    }
                                                    entity_info[attr_name] = entity_ref
                                        except:
                                            continue

                                except Exception as extraction_error:
                                    # Continue processing even if attribute extraction fails
                                    pass

                                # Add specific quantity values for better display (optimized)
                                if element_type.startswith('IfcQuantity'):
                                    quantity_attrs = ['LengthValue', 'AreaValue', 'VolumeValue', 'CountValue', 'WeightValue']
                                    for qty_attr in quantity_attrs:
                                        if hasattr(element, qty_attr):
                                            value = getattr(element, qty_attr)
                                            if value is not None:
                                                entity_info[qty_attr] = value

                                # Add material-specific attributes (optimized)
                                if element_type.startswith('IfcMaterial'):
                                    material_attrs = ['Category', 'Description', 'Name']
                                    for mat_attr in material_attrs:
                                        if hasattr(element, mat_attr):
                                            value = getattr(element, mat_attr)
                                            if value is not None:
                                                entity_info[mat_attr if mat_attr != 'Name' else 'MaterialName'] = value
                                    entity_info['MaterialType'] = element_type

                                # Add material layer attributes (optimized)
                                if element_type.startswith('IfcMaterialLayer'):
                                    layer_attrs = ['LayerThickness', 'Material']
                                    for layer_attr in layer_attrs:
                                        if hasattr(element, layer_attr):
                                            value = getattr(element, layer_attr)
                                            if value is not None:
                                                entity_info[layer_attr] = value
                                    entity_info['LayerType'] = element_type

                                # Add material relationship attributes (optimized)
                                if element_type.startswith('IfcRelAssociatesMaterial'):
                                    if hasattr(element, 'RelatingMaterial'):
                                        entity_info['RelatingMaterial'] = element.RelatingMaterial
                                    entity_info['RelationshipType'] = element_type

                                # Processing complete for this entity
                                entities[ifc_type].append(entity_info)
                                total_entities += 1
                                
                            except Exception as entity_error:
                                # Skip problematic entities silently for performance
                                continue
                        
                        # Report progress after each batch
                        if batch_start + batch_size < total_elements:
                            batch_progress = 28 + (38 * (type_idx + (batch_start + batch_size) / total_elements) / len(types_to_process))
                            progress_callback(batch_progress, "Transforming data to database format...")
                    
            except Exception as e:
                print(f"Error processing {ifc_type}: {e}")
        
        # Phase 5: Property extraction (66-85%)
        progress_callback(66, "Transforming data to database format...")
        
        # Get property sets data - optimized for performance
        print("Extracting key properties...")
        cursor.execute("SELECT COUNT(*) FROM psets")
        total_pset_count = cursor.fetchone()[0]

        # Only extract properties for major entity types
        major_type_ids = set()
        for ifc_type in types_to_process:
            if ifc_type in entities:
                for entity in entities[ifc_type]:
                    major_type_ids.add(entity['id'])

        # Process in batches to avoid SQLite parameter limit
        pset_data = []
        if major_type_ids:
            batch_size = 999  # Use max SQLite parameter limit for better performance
            ids_list = list(major_type_ids)
            total_batches = (len(ids_list) + batch_size - 1) // batch_size
            
            for i in range(0, len(ids_list), batch_size):
                batch_ids = ids_list[i:i + batch_size]
                placeholders = ','.join('?' * len(batch_ids))
                cursor.execute(f"SELECT ifc_id, pset_name, name, value FROM psets WHERE ifc_id IN ({placeholders}) ORDER BY ifc_id", batch_ids)
                pset_data.extend(cursor.fetchall())
                
                # Report progress every batch
                batch_num = i // batch_size + 1
                progress_percent = 66 + (19 * batch_num / total_batches)
                progress_callback(progress_percent, "Transforming data to database format...")

        # Enhanced property extraction with metadata (optimized)
        properties = []
        
        # Pre-compile keyword sets for faster lookup
        length_keywords = {'LENGTH', 'WIDTH', 'HEIGHT', 'DEPTH', 'THICKNESS', 'DIAMETER'}
        area_keywords = {'AREA', 'SURFACE'}
        volume_keywords = {'VOLUME', 'CAPACITY'}
        mass_keywords = {'MASS', 'WEIGHT'}
        cost_keywords = {'COST', 'PRICE', 'VALUE'}
        count_keywords = {'COUNT', 'QUANTITY', 'NUMBER'}
        force_keywords = {'LOAD', 'FORCE', 'STRESS'}
        material_keywords = {'MATERIAL', 'FINISH', 'COLOR', 'TYPE'}
        code_keywords = {'CODE', 'STANDARD', 'SPECIFICATION'}
        name_keywords = {'NAME', 'DESCRIPTION', 'LABEL'}
        
        # Process properties in batches for progress reporting
        prop_batch_size = 500  # Increased frequency for better feedback
        for prop_idx, (entity_id, pset_name, prop_name, prop_value) in enumerate(pset_data):
            # Report progress every 500 properties
            if prop_idx % prop_batch_size == 0:
                progress_percent = 80 + (5 * prop_idx / len(pset_data))
                progress_callback(progress_percent, "Transforming data to database format...")
                print(f"[PROGRESS] Property extraction: {progress_percent:.1f}% - {prop_idx}/{len(pset_data)} properties")
            
            property_info = {
                'entity_id': entity_id,
                'pset_name': pset_name,
                'property_name': prop_name,
                'property_value': prop_value,
                'property_type': 'Unknown',
                'unit': None,
                'category': 'Property'
            }

            # Optimized property type determination using pre-compiled sets
            prop_name_upper = prop_name.upper()
            
            if isinstance(prop_value, (int, float)):
                if any(keyword in prop_name_upper for keyword in length_keywords):
                    property_info.update({'property_type': 'Length', 'unit': 'mm', 'category': 'Dimension'})
                elif any(keyword in prop_name_upper for keyword in area_keywords):
                    property_info.update({'property_type': 'Area', 'unit': 'm²', 'category': 'Dimension'})
                elif any(keyword in prop_name_upper for keyword in volume_keywords):
                    property_info.update({'property_type': 'Volume', 'unit': 'm³', 'category': 'Dimension'})
                elif any(keyword in prop_name_upper for keyword in mass_keywords):
                    property_info.update({'property_type': 'Mass', 'unit': 'kg', 'category': 'Physical'})
                elif any(keyword in prop_name_upper for keyword in cost_keywords):
                    property_info.update({'property_type': 'Cost', 'unit': 'EUR', 'category': 'Economic'})
                elif any(keyword in prop_name_upper for keyword in count_keywords):
                    property_info.update({'property_type': 'Count', 'unit': 'pcs', 'category': 'Quantity'})
                elif any(keyword in prop_name_upper for keyword in force_keywords):
                    property_info.update({'property_type': 'Force', 'unit': 'kN', 'category': 'Structural'})
                else:
                    property_info.update({'property_type': 'Numeric', 'category': 'General'})

            elif isinstance(prop_value, str):
                if prop_value.startswith('#'):
                    property_info.update({'property_type': 'Entity Reference', 'category': 'Reference'})
                elif any(keyword in prop_name_upper for keyword in material_keywords):
                    property_info.update({'property_type': 'Material', 'category': 'Material'})
                elif any(keyword in prop_name_upper for keyword in code_keywords):
                    property_info.update({'property_type': 'Code', 'category': 'Specification'})
                elif any(keyword in prop_name_upper for keyword in name_keywords):
                    property_info.update({'property_type': 'Text', 'category': 'Identification'})
                else:
                    property_info.update({'property_type': 'Text', 'category': 'General'})

            elif isinstance(prop_value, bool):
                property_info.update({'property_type': 'Boolean', 'category': 'Condition'})
            else:
                property_info.update({'property_type': 'Complex', 'category': 'Complex'})

            # Add property set category based on name (optimized)
            pset_name_upper = pset_name.upper()
            if 'QTO_' in pset_name_upper or 'QUANTITY' in pset_name_upper:
                property_info['pset_category'] = 'Quantity'
            elif 'PSET_' in pset_name_upper:
                property_info['pset_category'] = 'Property Set'
            elif any(keyword in pset_name_upper for keyword in ['MATERIAL', 'FINISH', 'COLOR']):
                property_info['pset_category'] = 'Material'
            elif any(keyword in pset_name_upper for keyword in ['STRUCTURAL', 'LOAD', 'FORCE']):
                property_info['pset_category'] = 'Structural'
            else:
                property_info['pset_category'] = 'General'

            properties.append(property_info)

        print(f"Extracted {len(properties)} key properties (from {total_pset_count} total)")
        
        # Phase 6: Data serialization (85-95%)
        progress_callback(85, "Optimizing queries and indexing...")
        
        # Trigger Python garbage collection to free memory
        import gc
        gc.collect()
        
        # Prepare result
        result = {
            'tables': list(entities.keys()),
            'totalEntities': total_entities,
            'schema': ifc_file.schema,
            'entities': entities,
            'properties': properties,
            'processingMethod': 'Official ifc2sql.py Patcher with ifcopenshell.sql.sqlite (Optimized)',
            'fileName': filename
        }
        
        progress_callback(90, "Optimizing queries and indexing...")
        
        print("Processing completed successfully using optimized ifc2sql.py")
        print(f"Total entities processed: {total_entities}")
        print(f"Entity types found: {len(entities)}")
        print(f"Properties extracted: {len(properties)}")
        
        progress_callback(95, "Optimizing queries and indexing...")
        
        return result
        
    except Exception as e:
        print(f"Critical error processing IFC file: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to process IFC file '{filename}': {str(e)}")

print("IFC processing environment initialized with official ifc2sql.py")
        \`);
        
        // Official ifc2sql.py environment initialized successfully
        console.log('[v0] IFC processing environment initialized successfully');
        self.postMessage({ type: 'progress', progress: 100, step: 'Ready for processing' });
        self.postMessage({ type: 'init', data: { ready: true } });
        
      } catch (error) {
        console.error('[v0] Initialization failed:', error);
        self.postMessage({
          type: 'error',
          data: { 
            message: 'Failed to initialize IfcOpenShell: ' + error.message,
            stack: error.stack 
          }
        });
      }
    }

    async function processIfcFile(fileBuffer, fileName) {
      try {
        // Convert ArrayBuffer to bytes for Python
        const uint8Array = new Uint8Array(fileBuffer);
        pyodide.globals.set('file_content', uint8Array);
        pyodide.globals.set('file_name', fileName);
        
        // Create progress callback for Python using JavaScript function
        const sendProgress = (percent, message) => {
          self.postMessage({ 
            type: 'progress', 
            progress: percent, 
            step: message 
          });
        };
        pyodide.globals.set('send_progress_js', sendProgress);
        
        await pyodide.runPythonAsync(\`
# Create a callback function that calls the JavaScript function
def progress_callback(percent, message):
    """Send progress updates to JavaScript"""
    send_progress_js(percent, message)

print("[DEBUG] Progress callback initialized")
        \`);
        
        // Execute the processing function with progress reporting
        // Add a heartbeat to keep UI responsive during long operations
        let heartbeatInterval = null;
        let lastProgressTime = Date.now();
        
        // Start heartbeat to detect if processing is stuck
        heartbeatInterval = setInterval(() => {
          const timeSinceLastProgress = Date.now() - lastProgressTime;
          if (timeSinceLastProgress > 10000) { // 10 seconds without progress
            console.log('[HEARTBEAT] Processing still active, no progress updates for', Math.round(timeSinceLastProgress/1000), 'seconds');
            // Send a heartbeat message to keep UI responsive
            self.postMessage({ 
              type: 'progress', 
              progress: 25, 
              step: 'Processing large file - please wait...' 
            });
          }
        }, 5000); // Check every 5 seconds
        
        // Override progress callback to track last update time
        const originalSendProgress = sendProgress;
        const trackedSendProgress = (percent, message) => {
          lastProgressTime = Date.now();
          originalSendProgress(percent, message);
        };
        pyodide.globals.set('send_progress_js', trackedSendProgress);
        
        try {
          await pyodide.runPythonAsync(\`
print("[DEBUG] About to call process_ifc_to_sqlite with official ifc2sql.py...")
processing_result = process_ifc_to_sqlite(file_content, file_name)
print("[DEBUG] Official ifc2sql.py processing completed successfully")

global sqlite_db_path
sqlite_db_path = '/tmp/model.db'
print(f"[DEBUG] SQLite database path set to: {sqlite_db_path}")
          \`);
        } finally {
          // Clean up heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
        
        sqliteDbPath = '/tmp/model.db';
        
        // Get the result from Python (Python completed at 95%)
        const result = pyodide.globals.get('processing_result');
        
        if (!result) {
          throw new Error('No result returned from Python processing');
        }
        
        // Phase 7: JavaScript finalization (95-100%)
        self.postMessage({ type: 'progress', progress: 96, step: 'Optimizing queries and indexing...' });
        
        let jsResult;
        try {
          // Convert to JS with proper dict converter
          jsResult = result.toJs ? result.toJs({ dict_converter: Object.fromEntries }) : result;

          // Debug: Basic info about the result
          if (!jsResult.entities || Object.keys(jsResult.entities).length === 0) {
            console.warn('[v0] Warning: No entities found in processing result');
          }

          // Convert PyProxy objects to plain JavaScript objects for worker communication
          const convertPyProxyToJS = (obj, depth = 0) => {
            if (!obj || typeof obj !== 'object') {
              return obj;
            }

            // Prevent infinite recursion
            if (depth > 10) {
              console.warn('[v0] Max depth reached, returning string representation');
              return String(obj);
            }

            // Handle PyProxy objects specifically
            if (obj.constructor && obj.constructor.name === 'PyProxy') {
              try {
                const converted = obj.toJs ? obj.toJs({ dict_converter: Object.fromEntries }) : String(obj);
                // Explicitly destroy PyProxy to free memory
                if (obj.destroy) {
                  obj.destroy();
                }
                return convertPyProxyToJS(converted, depth + 1);
              } catch (e) {
                console.error('[v0] Error converting PyProxy:', e);
                return String(obj);
              }
            }

            // Handle arrays
            if (Array.isArray(obj)) {
              return obj.map(item => convertPyProxyToJS(item, depth + 1));
            }

            // Handle regular objects - preserve all properties
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
              result[key] = convertPyProxyToJS(value, depth + 1);
            }
            return result;
          };

          jsResult = convertPyProxyToJS(jsResult);
          
          self.postMessage({ type: 'progress', progress: 98, step: 'Optimizing queries and indexing...' });

          // Final JSON serialization with special handling for complex objects
          jsResult = JSON.parse(JSON.stringify(jsResult, (key, value) => {
            // Last chance to handle any remaining proxy objects
            if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PyProxy') {
              const converted = value.toJs ? value.toJs() : String(value);
              // Destroy PyProxy after conversion
              if (value.destroy) {
                value.destroy();
              }
              return converted;
            }
            return value;
          }));

          // Explicitly destroy the original result PyProxy
          if (result.destroy) {
            result.destroy();
          }

          // Processing completed silently
        } catch (conversionError) {
          console.error('[v0] Error converting Python result:', conversionError);
          // Ensure cleanup even on error
          if (result && result.destroy) {
            result.destroy();
          }
          throw new Error('Failed to convert Python result to JavaScript: ' + conversionError.message);
        }
        
        if (jsResult && jsResult.error) {
          throw new Error('Python processing error: ' + jsResult.message);
        }
        
        // Final step: 100% - all processing and conversion complete
        self.postMessage({ type: 'progress', progress: 100, step: 'Processing Complete' });
        self.postMessage({ type: 'complete', data: jsResult });
        
      } catch (error) {
        console.error('[v0] File processing failed:', error);
        self.postMessage({
          type: 'error',
          data: { 
            message: 'Failed to process IFC file: ' + error.message,
            stack: error.stack 
          }
        });
      }
    }

    async function executeQuery(query) {
      try {
        // Executing SQL query silently
        
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
          throw new Error('Failed to convert query results to JavaScript: ' + conversionError.message);
        }
        
        if (jsResults && jsResults.error) {
          throw new Error('SQL execution error: ' + jsResults.error);
        }
        
        // Query executed successfully
        self.postMessage({ type: 'query_result', data: jsResults });
        
      } catch (error) {
        console.error('[v0] Query execution failed:', error);
        self.postMessage({
          type: 'error',
          data: {
            message: 'Failed to execute query: ' + error.message,
            stack: error.stack
          }
        });
      }
    }

    async function exportSQLiteDatabase() {
      try {
        // Exporting SQLite database silently

        if (!pyodide) {
          throw new Error('Pyodide not initialized');
        }

        if (!sqliteDbPath) {
          throw new Error('No SQLite database available. Please process an IFC file first.');
        }

        // Read the SQLite database file from Pyodide's virtual filesystem
        const bytes = pyodide.FS.readFile(sqliteDbPath);

        // Send the database bytes back to the main thread
        // Use transferrable ArrayBuffer for better performance
        self.postMessage({
          type: 'sqlite_export',
          data: bytes
        }, [bytes.buffer]);

      } catch (error) {
        console.error('[v0] SQLite export failed:', error);
        self.postMessage({
          type: 'error',
          data: {
            message: 'Failed to export SQLite database: ' + (error && error.message ? error.message : String(error)),
            stack: error && error.stack ? error.stack : undefined
          }
        });
      }
    }

    async function extractSchemaDefinition() {
      try {
        if (!pyodide) {
          throw new Error('Pyodide not initialized');
        }

        if (!sqliteDbPath) {
          throw new Error('No SQLite database available. Please process an IFC file first.');
        }

        await pyodide.runPythonAsync(\`
import sqlite3

if 'sqlite_db_path' not in globals():
    sqlite_db_path = '/tmp/model.db'

conn = sqlite3.connect(sqlite_db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

tables = []
foreign_keys = []

table_rows = cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()

for table_row in table_rows:
    table_name = table_row["name"] if isinstance(table_row, sqlite3.Row) else table_row[0]
    column_rows = cursor.execute(f'PRAGMA table_info("{table_name}")').fetchall()
    columns = []
    for column in column_rows:
        col_name = column["name"] if isinstance(column, sqlite3.Row) else column[1]
        col_type = column["type"] if isinstance(column, sqlite3.Row) else column[2]
        not_null = column["notnull"] if isinstance(column, sqlite3.Row) else column[3]
        pk = column["pk"] if isinstance(column, sqlite3.Row) else column[5]
        columns.append({
            "name": col_name,
            "type": col_type or "",
            "notNull": bool(not_null),
            "pk": bool(pk)
        })

    tables.append({
        "name": table_name,
        "columns": columns
    })

    fk_rows = cursor.execute(f'PRAGMA foreign_key_list("{table_name}")').fetchall()
    for fk in fk_rows:
        if isinstance(fk, sqlite3.Row):
            from_col = fk["from"]
            to_table = fk["table"]
            to_col = fk["to"]
        else:
            from_col = fk[3]
            to_table = fk[2]
            to_col = fk[4]

        foreign_keys.append({
            "fromTable": table_name,
            "fromColumn": from_col,
            "toTable": to_table,
            "toColumn": to_col
        })

conn.close()

schema_result = {
    "tables": tables,
    "foreignKeys": foreign_keys
}
        \`);

        const schema = pyodide.globals.get('schema_result');

        if (!schema) {
          throw new Error('Failed to extract schema data');
        }

        let jsSchema;
        try {
          jsSchema = schema.toJs ? schema.toJs({ dict_converter: Object.fromEntries }) : schema;
          jsSchema = JSON.parse(JSON.stringify(jsSchema));
        } finally {
          if (schema.destroy) {
            schema.destroy();
          }
        }

        self.postMessage({ type: 'schema_result', data: jsSchema });
      } catch (error) {
        console.error('[v0] Schema extraction failed:', error);
        self.postMessage({
          type: 'error',
          data: {
            message: 'Failed to extract schema: ' + (error && error.message ? error.message : String(error)),
            stack: error && error.stack ? error.stack : undefined
          }
        });
      }
    }
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}
