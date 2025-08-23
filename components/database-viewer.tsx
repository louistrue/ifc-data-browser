"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeftIcon, DatabaseIcon, TableIcon, InfoIcon, ChevronRightIcon, HashIcon } from "lucide-react"
import type { ProcessingResult } from "@/lib/pyodide-worker"
import { DataTable } from "@/components/data-table"
import { QueryInterface } from "@/components/query-interface"

interface DatabaseViewerProps {
  data: ProcessingResult
  onBackToUpload: () => void
  fileName?: string
  usePyodide: any
}

export function DatabaseViewer({ data, onBackToUpload, fileName = "unknown.ifc", usePyodide }: DatabaseViewerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [showAllEntities, setShowAllEntities] = useState(false)

  console.log("[v0] DatabaseViewer received data:", data)
  console.log("[v0] Data tables:", data.tables)
  console.log("[v0] Data entities keys:", Object.keys(data.entities))

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName)
    // setActiveTab("entities") - removed this line
  }

  const handleBackToOverview = () => {
    setSelectedTable(null)
    // setActiveTab("overview") - removed this line
  }

  const extractPropertySets = () => {
    const allPsets: any[] = []

    if (data.properties && Array.isArray(data.properties)) {
      return data.properties.filter((prop: any) => {
        const psetName = prop.pset_name?.toLowerCase() || ""
        const propName = prop.property_name?.toLowerCase() || ""

        // Exclude quantity-related property sets and properties
        return (
          !psetName.includes("quantity") &&
          !psetName.startsWith("qto_") &&
          !propName.includes("quantity") &&
          !propName.includes("length") &&
          !propName.includes("width") &&
          !propName.includes("height") &&
          !propName.includes("area") &&
          !propName.includes("volume") &&
          !propName.includes("weight")
        )
      })
    }

    Object.entries(data.entities).forEach(([entityType, entities]) => {
      if (Array.isArray(entities)) {
        entities.forEach((entity: any) => {
          if (entity.PropertySets) {
            Object.entries(entity.PropertySets).forEach(([psetName, psetData]: [string, any]) => {
              const psetNameLower = psetName.toLowerCase()
              if (
                !psetNameLower.includes("quantity") &&
                !psetNameLower.startsWith("qto_") &&
                !psetNameLower.includes("basequantities")
              ) {
                Object.entries(psetData).forEach(([propName, propValue]) => {
                  allPsets.push({
                    entity_id: entity.id,
                    entity_type: entityType,
                    entity_name: entity.Name || entity.GlobalId,
                    pset_name: psetName,
                    property_name: propName,
                    property_value: propValue,
                  })
                })
              }
            })
          }
        })
      }
    })

    return allPsets
  }

  const extractMaterials = () => {
    const materials: any[] = []

    // Check for IfcMaterial entities
    if (data.entities.IfcMaterial && Array.isArray(data.entities.IfcMaterial)) {
      materials.push(...data.entities.IfcMaterial)
    }

    // Check for IfcMaterialLayer entities
    if (data.entities.IfcMaterialLayer && Array.isArray(data.entities.IfcMaterialLayer)) {
      materials.push(...data.entities.IfcMaterialLayer)
    }

    // Check for IfcMaterialLayerSet entities
    if (data.entities.IfcMaterialLayerSet && Array.isArray(data.entities.IfcMaterialLayerSet)) {
      materials.push(...data.entities.IfcMaterialLayerSet)
    }

    // Check for IfcMaterialLayerSetUsage entities
    if (data.entities.IfcMaterialLayerSetUsage && Array.isArray(data.entities.IfcMaterialLayerSetUsage)) {
      materials.push(...data.entities.IfcMaterialLayerSetUsage)
    }

    // Check for IfcMaterialList entities
    if (data.entities.IfcMaterialList && Array.isArray(data.entities.IfcMaterialList)) {
      materials.push(...data.entities.IfcMaterialList)
    }

    // Check for IfcMaterialDefinitionRepresentation entities
    if (
      data.entities.IfcMaterialDefinitionRepresentation &&
      Array.isArray(data.entities.IfcMaterialDefinitionRepresentation)
    ) {
      materials.push(...data.entities.IfcMaterialDefinitionRepresentation)
    }

    return materials
  }

  const extractClassifications = () => {
    const classifications: any[] = []

    // Check for IfcClassification entities
    if (data.entities.IfcClassification && Array.isArray(data.entities.IfcClassification)) {
      classifications.push(...data.entities.IfcClassification)
    }

    // Check for IfcClassificationReference entities
    if (data.entities.IfcClassificationReference && Array.isArray(data.entities.IfcClassificationReference)) {
      classifications.push(...data.entities.IfcClassificationReference)
    }

    // Check for IfcRelAssociatesClassification entities
    if (data.entities.IfcRelAssociatesClassification && Array.isArray(data.entities.IfcRelAssociatesClassification)) {
      classifications.push(...data.entities.IfcRelAssociatesClassification)
    }

    return classifications
  }

  const extractQuantities = () => {
    const quantities: any[] = []

    const quantityTypes = [
      "IfcQuantityLength",
      "IfcQuantityArea",
      "IfcQuantityVolume",
      "IfcQuantityCount",
      "IfcQuantityWeight",
      "IfcQuantityTime",
    ]

    quantityTypes.forEach((quantityType) => {
      if (data.entities[quantityType] && Array.isArray(data.entities[quantityType])) {
        data.entities[quantityType].forEach((quantity: any) => {
          // Extract the actual numeric value based on quantity type
          let numericValue = null
          let unit = ""

          if (quantity.LengthValue !== undefined) {
            numericValue = quantity.LengthValue
            unit = "mm"
          } else if (quantity.AreaValue !== undefined) {
            numericValue = quantity.AreaValue
            unit = "m²"
          } else if (quantity.VolumeValue !== undefined) {
            numericValue = quantity.VolumeValue
            unit = "m³"
          } else if (quantity.CountValue !== undefined) {
            numericValue = quantity.CountValue
            unit = "count"
          } else if (quantity.WeightValue !== undefined) {
            numericValue = quantity.WeightValue
            unit = "kg"
          } else if (quantity.TimeValue !== undefined) {
            numericValue = quantity.TimeValue
            unit = "hours"
          }

          quantities.push({
            entity_id: quantity.id,
            entity_type: quantityType,
            entity_name: quantity.Name || quantity.GlobalId || `${quantityType}_${quantity.id}`,
            quantity_type: quantityType.replace("IfcQuantity", ""),
            property_name: quantity.Name || "Value",
            property_value: numericValue,
            unit: unit,
            method_of_measurement: quantity.MethodOfMeasurement || "",
            description: quantity.Description || "",
          })
        })
      }
    })

    if (data.entities.IfcElementQuantity && Array.isArray(data.entities.IfcElementQuantity)) {
      data.entities.IfcElementQuantity.forEach((elementQuantity: any) => {
        // Look for nested quantity objects within IfcElementQuantity
        Object.entries(elementQuantity).forEach(([key, value]) => {
          if (
            key !== "id" &&
            key !== "GlobalId" &&
            key !== "OwnerHistory" &&
            key !== "Name" &&
            key !== "Description" &&
            key !== "MethodOfMeasurement" &&
            typeof value === "object" &&
            value !== null
          ) {
            // If the value is an object, try to extract numeric properties
            if (typeof value === "object" && !Array.isArray(value)) {
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (typeof subValue === "number") {
                  quantities.push({
                    entity_id: elementQuantity.id,
                    entity_type: "IfcElementQuantity",
                    entity_name:
                      elementQuantity.Name || elementQuantity.GlobalId || `ElementQuantity_${elementQuantity.id}`,
                    quantity_type: "BaseQuantities",
                    property_name: subKey,
                    property_value: subValue,
                    unit:
                      subKey.toLowerCase().includes("length") ||
                        subKey.toLowerCase().includes("width") ||
                        subKey.toLowerCase().includes("height")
                        ? "mm"
                        : subKey.toLowerCase().includes("area")
                          ? "m²"
                          : subKey.toLowerCase().includes("volume")
                            ? "m³"
                            : "",
                    method_of_measurement: elementQuantity.MethodOfMeasurement || "",
                    description: elementQuantity.Description || "",
                  })
                }
              })
            }
          }
        })
      })
    }

    return quantities
  }

  const enhanceEntityData = (entities: any[]) => {
    return entities.map((entity: any) => {
      const enhanced = { ...entity }

      // Add structural properties from PropertySets
      if (entity.PropertySets?.Pset_WallCommon?.LoadBearing !== undefined) {
        enhanced.is_loadbearing = entity.PropertySets.Pset_WallCommon.LoadBearing === 1 ? "Yes" : "No"
      }

      if (entity.PropertySets?.Pset_WallCommon?.IsExternal !== undefined) {
        enhanced.is_external = entity.PropertySets.Pset_WallCommon.IsExternal === 1 ? "Yes" : "No"
      }

      return enhanced
    })
  }

  const getSpecialTables = () => {
    const propertyData = extractPropertySets()
    const materialsData = extractMaterials()
    const classificationsData = extractClassifications()
    const quantitiesData = extractQuantities()

    return {
      properties: propertyData,
      materials: materialsData,
      classifications: classificationsData,
      quantities: quantitiesData,
      metadata: [
        {
          schema: data.schema,
          total_entities: data.totalEntities,
          file_name: fileName,
          processing_method: "Official ifc2sql.py Patcher with ifcopenshell.sql.sqlite",
          sqlite_size: "N/A (WebAssembly)",
        },
      ],
    }
  }

  const getEntityTables = () => {
    return data.tables.filter((table) => data.entities[table] && Array.isArray(data.entities[table]))
  }

  // European-style number formatting with spaces as thousands separators
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  const getFilteredEntityTables = () => {
    const allTables = getEntityTables()

    if (showAllEntities) {
      return allTables
    }

    // IfcBuiltElement types - physical building components
    const builtElementTypes = [
      "IfcWall",
      "IfcSlab",
      "IfcBeam",
      "IfcColumn",
      "IfcDoor",
      "IfcWindow",
      "IfcRoof",
      "IfcStair",
      "IfcRamp",
      "IfcCurtainWall",
      "IfcPlate",
      "IfcMember",
      "IfcBuildingElementPart",
      "IfcBuildingElementProxy",
      "IfcFooting",
      "IfcPile",
      "IfcRailing",
      "IfcCovering",
      "IfcCeiling",
      "IfcFlowTerminal",
      "IfcDistributionElement",
      "IfcFurnishingElement",
      "IfcElementAssembly",
      "IfcTransportElement",
      "IfcVirtualElement",
    ]

    return allTables.filter((table) => builtElementTypes.includes(table))
  }

  const getPsetStats = () => {
    const propertyData = extractPropertySets()
    const psetNames = [...new Set(propertyData.map((p) => p.pset_name))]
    return {
      totalProperties: propertyData.length,
      uniquePsets: psetNames.length,
      psetNames: psetNames.slice(0, 10),
    }
  }

  const specialTables = getSpecialTables()
  const entityTables = getEntityTables()
  const filteredEntityTables = getFilteredEntityTables()
  const psetStats = getPsetStats()

  console.log("[v0] Entity tables:", entityTables)
  console.log("[v0] Property stats:", psetStats)
  console.log("[v0] Quantities data:", specialTables.quantities.length)

  return (
    <div className="space-y-6 db-view">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBackToUpload}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <div className="flex items-center space-x-2">
            <DatabaseIcon className="w-5 h-5 text-primary" />
            <h1 className="font-inter text-2xl font-bold text-foreground">IFCsql</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="db-chip bg-primary/10 text-primary h-6 px-2">
            {data.schema}
          </Badge>
          <Badge variant="outline" className="db-chip h-6 px-2">{data.totalEntities} entities</Badge>
          {psetStats.totalProperties > 0 && (
            <Badge variant="outline" className="db-chip bg-green-50 text-green-700 h-6 px-2">
              {psetStats.totalProperties} properties
            </Badge>
          )}
          {specialTables.quantities.length > 0 && (
            <Badge variant="outline" className="db-chip bg-orange-50 text-orange-700 h-6 px-2">
              {specialTables.quantities.length} quantities
            </Badge>
          )}
          {specialTables.materials.length > 0 && (
            <Badge variant="outline" className="db-chip bg-blue-50 text-blue-700 h-6 px-2">
              {specialTables.materials.length} materials
            </Badge>
          )}
          {specialTables.classifications.length > 0 && (
            <Badge variant="outline" className="db-chip bg-purple-50 text-purple-700 h-6 px-2">
              {specialTables.classifications.length} classifications
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation breadcrumb */}
      {selectedTable && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <button onClick={handleBackToOverview} className="hover:text-foreground transition-colors">
            Database Overview
          </button>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-foreground font-medium">{selectedTable}</span>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 db-tabs-list db-tabs-sticky">
          <TabsTrigger className="db-tabs-trigger" value="overview">Overview</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="entities">Entities</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="properties">Properties</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="quantities">Quantities</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="materials">Materials</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="classifications">Classifications</TabsTrigger>
          <TabsTrigger className="db-tabs-trigger" value="query">Query</TabsTrigger>
        </TabsList>

        {/* Database Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card className="!rounded-[4px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entity Tables</CardTitle>
                <TableIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="db-metric-value">{formatNumber(entityTables.length)}</div>
                <p className="text-xs text-muted-foreground">IFC entity types</p>
              </CardContent>
            </Card>

            <Card className="!rounded-[4px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
                <HashIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="db-metric-value">{formatNumber(data.totalEntities)}</div>
                <p className="text-xs text-muted-foreground">Building elements</p>
              </CardContent>
            </Card>

            <Card className="!rounded-[4px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Properties</CardTitle>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="db-metric-value">{formatNumber(psetStats.totalProperties)}</div>
                <p className="text-xs text-muted-foreground">{formatNumber(psetStats.uniquePsets)} property sets</p>
              </CardContent>
            </Card>

            <Card className="!rounded-[4px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Materials</CardTitle>
                <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="db-metric-value">{formatNumber(specialTables.materials.length)}</div>
                <p className="text-xs text-muted-foreground">Material entries</p>
              </CardContent>
            </Card>

            <Card className="!rounded-[4px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quantities</CardTitle>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="db-metric-value">{formatNumber(specialTables.quantities.length)}</div>
                <p className="text-xs text-muted-foreground">Quantity entries</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="!rounded-[4px]">
              <CardHeader>
                <CardTitle>Database Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Core Tables</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Badge variant="outline" className="db-tag justify-center text-xs px-2 py-0.5">
                      metadata ({formatNumber(specialTables.metadata.length)})
                    </Badge>
                    <Badge variant="outline" className="db-tag justify-center text-xs px-2 py-0.5">
                      id_map ({formatNumber(data.entities.id_map ? data.entities.id_map.length : 0)})
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rich Data Tables</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Badge variant="secondary" className="db-chip justify-center text-xs px-2 py-0.5">
                      properties ({formatNumber(specialTables.properties.length)})
                    </Badge>
                    <Badge variant="secondary" className="db-chip justify-center text-xs px-2 py-0.5">
                      materials ({formatNumber(specialTables.materials.length)})
                    </Badge>
                    <Badge variant="secondary" className="db-chip justify-center text-xs px-2 py-0.5">
                      classifications ({formatNumber(specialTables.classifications.length)})
                    </Badge>
                    <Badge variant="secondary" className="db-chip justify-center text-xs px-2 py-0.5">
                      quantities ({formatNumber(specialTables.quantities.length)})
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Entity Tables</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(entityTables.length)} IFC entity types with full attribute data including structural properties
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="!rounded-[4px]">
              <CardHeader>
                <CardTitle>Data Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {psetStats.totalProperties > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Property Sets</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {psetStats.psetNames.map((pset) => (
                        <Badge key={pset} variant="outline" className="db-tag text-xs px-2 py-0.5">
                          {pset}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {psetStats.totalProperties} properties across {psetStats.uniquePsets} property sets
                    </p>
                  </div>
                )}
                {specialTables.materials.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Materials</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(specialTables.materials.length)} unique materials extracted from property sets and references
                    </p>
                  </div>
                )}
                {specialTables.classifications.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Classifications</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(specialTables.classifications.length)} classified elements with IfcClassificationReference
                    </p>
                  </div>
                )}
                {specialTables.quantities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Quantities</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(specialTables.quantities.length)} element quantities and base quantities extracted from IFC
                      elements
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entities" className="space-y-6">
          {!selectedTable ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TableIcon className="w-5 h-5" />
                    <span>IFC Entity Tables</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {showAllEntities ? `All ${formatNumber(entityTables.length)}` : `Built Elements ${formatNumber(filteredEntityTables.length)}`}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowAllEntities(!showAllEntities)}>
                      {showAllEntities ? "Show Built Elements Only" : "Show All Entities"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {showAllEntities
                      ? "Showing all IFC entity types including organizational, geometric, and relationship entities."
                      : "Showing only IfcBuiltElement types - physical building components like walls, slabs, beams, doors, and windows."}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredEntityTables.map((tableName) => {
                    const tableData = data.entities[tableName] || []
                    return (
                      <Card
                        key={tableName}
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20"
                        onClick={() => handleTableSelect(tableName)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">{tableName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatNumber(tableData.length)} {tableData.length === 1 ? "record" : "records"}
                              </p>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              tableName={selectedTable}
              data={enhanceEntityData(data.entities[selectedTable] || [])}
              onBack={() => setSelectedTable(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <DataTable
            tableName="properties"
            data={specialTables.properties}
            onBack={() => setActiveTab("overview")}
            customTitle="Property Sets & Values"
            description="All property sets and their values extracted from IFC elements (excluding quantities)"
          />
        </TabsContent>

        <TabsContent value="quantities" className="space-y-6">
          <DataTable
            tableName="quantities"
            data={specialTables.quantities}
            onBack={() => setActiveTab("overview")}
            customTitle="Element Quantities & BaseQuantities"
            description="IFC element quantities including IfcElementQuantity BaseQuantities with dimensional and measurement data"
          />
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <DataTable
            tableName="materials"
            data={specialTables.materials}
            onBack={() => setActiveTab("overview")}
            customTitle="IFC Materials"
            description="IFC material entities including IfcMaterial, IfcMaterialLayer, IfcMaterialLayerSet, and related material definitions"
          />
        </TabsContent>

        <TabsContent value="classifications" className="space-y-6">
          <DataTable
            tableName="classifications"
            data={specialTables.classifications}
            onBack={() => setActiveTab("overview")}
            customTitle="IFC Classifications"
            description="IFC classification entities including IfcClassification, IfcClassificationReference, and classification relationships"
          />
        </TabsContent>

        {/* Enhanced Query Interface */}
        <TabsContent value="query" className="space-y-6">
          <QueryInterface
            tables={data.tables}
            entities={data.entities}
            specialTables={specialTables}
            psetStats={psetStats}
            usePyodide={usePyodide}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
