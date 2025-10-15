"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  PlayIcon,
  DatabaseIcon,
  InfoIcon,
  BookOpenIcon,
  CopyIcon,
  ChevronDownIcon,
  SparklesIcon,
  TrendingUpIcon,
  BuildingIcon,
  LayersIcon,
  SearchIcon,
  DownloadIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileCodeIcon,
  TableIcon,
  ColumnsIcon,
  LinkIcon,
  EyeIcon,
  FilterIcon,
  ChevronRightIcon,
  ChevronDownIcon as ChevronDownIcon2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import * as XLSX from "xlsx"

interface QueryInterfaceProps {
  tables: string[]
  entities: Record<string, any[]>
  specialTables: any
  psetStats: any
  usePyodide: any
  schema?: any
}

const sampleQueries = [
  {
    category: "🏠 Building Elements",
    description: "Explore structural and architectural elements",
    queries: [
      {
        name: "Building Elements Overview",
        description: "Show only physical building elements (walls, doors, etc.)",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nWHERE ifc_class LIKE '%Wall%' OR ifc_class LIKE '%Door%' OR ifc_class LIKE '%Window%'\n   OR ifc_class LIKE '%Slab%' OR ifc_class LIKE '%Beam%' OR ifc_class LIKE '%Column%'\n   OR ifc_class LIKE '%Roof%' OR ifc_class LIKE '%Floor%'\nGROUP BY ifc_class\nORDER BY Count DESC;",
        icon: BuildingIcon,
        difficulty: "beginner",
        tags: ["structural", "elements"]
      },
      {
        name: "Wall Analysis",
        description: "Get wall information with available properties",
        sql: "SELECT DISTINCT\n  p1.ifc_id as Element_ID,\n  COALESCE(p1.value, 'No Description') as Name,\n  id.ifc_class as ObjectType,\n  p2.value as LoadBearing,\n  p3.value as IsExternal,\n  p4.value as Height,\n  p5.value as Length,\n  p6.value as Width\nFROM psets p1\nJOIN id_map id ON p1.ifc_id = id.ifc_id\nLEFT JOIN psets p2 ON p1.ifc_id = p2.ifc_id AND p2.name = 'LoadBearing'\nLEFT JOIN psets p3 ON p1.ifc_id = p3.ifc_id AND p3.name = 'IsExternal'\nLEFT JOIN psets p4 ON p1.ifc_id = p4.ifc_id AND p4.name = 'Height'\nLEFT JOIN psets p5 ON p1.ifc_id = p5.ifc_id AND p5.name = 'Length'\nLEFT JOIN psets p6 ON p1.ifc_id = p6.ifc_id AND p6.name = 'Width'\nWHERE id.ifc_class LIKE '%Wall%'\nAND (p1.name = 'Description' OR p1.name = 'Reference')\nLIMIT 50;",
        icon: BuildingIcon,
        difficulty: "intermediate",
        tags: ["walls", "properties"]
      },
      {
        name: "Building Hierarchy",
        description: "Show the building structure hierarchy from available data",
        sql: "SELECT\n  CASE\n    WHEN id.ifc_class LIKE '%Project%' THEN 'Project'\n    WHEN id.ifc_class LIKE '%Site%' THEN 'Site'\n    WHEN id.ifc_class LIKE '%Building%' AND id.ifc_class NOT LIKE '%Storey%' THEN 'Building'\n    WHEN id.ifc_class LIKE '%Storey%' THEN 'Storey'\n    ELSE 'Other'\n  END as Level,\n  p.value as Name,\n  id.ifc_class as Type\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE (p.name = 'Name' OR p.name = 'Description' OR p.name = 'Reference')\n  AND p.value IS NOT NULL AND p.value != ''\nORDER BY\n  CASE\n    WHEN id.ifc_class LIKE '%Project%' THEN 1\n    WHEN id.ifc_class LIKE '%Site%' THEN 2\n    WHEN id.ifc_class LIKE '%Building%' AND id.ifc_class NOT LIKE '%Storey%' THEN 3\n    WHEN id.ifc_class LIKE '%Storey%' THEN 4\n    ELSE 5\n  END;",
        icon: LayersIcon,
        difficulty: "intermediate",
        tags: ["hierarchy", "structure"]
      },
      {
        name: "Element Count Analysis",
        description: "Count of all building elements by IFC class type",
        sql: "SELECT\n  id.ifc_class as Element_Type,\n  COUNT(DISTINCT p.ifc_id) as Count,\n  CASE\n    WHEN id.ifc_class LIKE '%Wall%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Slab%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Beam%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Column%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Door%' THEN 'Opening'\n    WHEN id.ifc_class LIKE '%Window%' THEN 'Opening'\n    ELSE 'Other'\n  END as Category\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nGROUP BY id.ifc_class\nORDER BY Count DESC\nLIMIT 20;",
        icon: TrendingUpIcon,
        difficulty: "intermediate",
        tags: ["analysis", "counts"]
      },
      {
        name: "Advanced Element Relationships",
        description: "Complex analysis of element relationships and spatial connections",
        sql: "WITH ElementHierarchy AS (\n  SELECT \n    id.ifc_id,\n    id.ifc_class,\n    COALESCE(p1.value, 'Unnamed') as Element_Name,\n    p2.value as Parent_Name,\n    p3.value as Level_Name,\n    p4.value as Space_Name,\n    CASE \n      WHEN id.ifc_class LIKE '%Wall%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Slab%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Beam%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Column%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Door%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Window%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Roof%' THEN 'Enclosure'\n      WHEN id.ifc_class LIKE '%Floor%' THEN 'Enclosure'\n      ELSE 'Other'\n    END as Element_Category\n  FROM id_map id\n  LEFT JOIN psets p1 ON id.ifc_id = p1.ifc_id AND p1.name IN ('Name', 'Description')\n  LEFT JOIN psets p2 ON id.ifc_id = p2.ifc_id AND p2.name = 'Parent'\n  LEFT JOIN psets p3 ON id.ifc_id = p3.ifc_id AND p3.name = 'Level'\n  LEFT JOIN psets p4 ON id.ifc_id = p4.ifc_id AND p4.name = 'Space'\n),\nElementStats AS (\n  SELECT \n    Element_Name,\n    ifc_class as Element_Type,\n    Element_Category,\n    Parent_Name,\n    Level_Name,\n    Space_Name,\n    COUNT(*) OVER (PARTITION BY ifc_class) as Type_Count,\n    COUNT(*) OVER (PARTITION BY Element_Category) as Category_Count,\n    COUNT(*) OVER (PARTITION BY Level_Name) as Level_Count,\n    ROW_NUMBER() OVER (PARTITION BY ifc_class ORDER BY Element_Name) as Type_Rank,\n    ROW_NUMBER() OVER (PARTITION BY Element_Category ORDER BY Element_Name) as Category_Rank\n  FROM ElementHierarchy\n  WHERE Element_Name != 'Unnamed' AND Element_Name IS NOT NULL\n)\nSELECT \n  Element_Name,\n  Element_Type,\n  Element_Category,\n  Parent_Name,\n  Level_Name,\n  Space_Name,\n  Type_Count,\n  Category_Count,\n  Level_Count,\n  Type_Rank,\n  Category_Rank,\n  CASE \n    WHEN Level_Count > 10 THEN 'High Density Level'\n    WHEN Level_Count > 5 THEN 'Medium Density Level'\n    WHEN Level_Count > 1 THEN 'Low Density Level'\n    ELSE 'Isolated Element'\n  END as Density_Classification\nFROM ElementStats\nORDER BY Type_Count DESC, Category_Count DESC, Element_Name\nLIMIT 25;",
        icon: LayersIcon,
        difficulty: "advanced",
        tags: ["relationships", "hierarchy", "spatial"]
      },
      {
        name: "Material-Property Cross Analysis",
        description: "Advanced correlation between materials and their properties",
        sql: "WITH MaterialAnalysis AS (\n  SELECT \n    m.Name as Material_Name,\n    CASE \n      WHEN m.Name LIKE '%Layer%' THEN 'Multi-Layer'\n      WHEN m.Name LIKE '%Set%' THEN 'Material Set'\n      WHEN m.Name LIKE '%Concrete%' OR m.Name LIKE '%StB%' THEN 'Concrete'\n      WHEN m.Name LIKE '%Wood%' OR m.Name LIKE '%Holz%' THEN 'Wood'\n      WHEN m.Name LIKE '%Steel%' OR m.Name LIKE '%Stahl%' THEN 'Steel'\n      ELSE 'Other'\n    END as Material_Category,\n    COUNT(DISTINCT ram.ifc_id) as Element_Relations,\n    COUNT(DISTINCT ram.RelatingMaterial) as Material_Relations,\n    GROUP_CONCAT(DISTINCT ram.RelatedObjects) as Related_Elements,\n    COUNT(DISTINCT id.ifc_class) as Element_Types_Count,\n    GROUP_CONCAT(DISTINCT id.ifc_class) as Element_Types\n  FROM IfcMaterial m\n  LEFT JOIN IfcRelAssociatesMaterial ram ON m.ifc_id = ram.RelatingMaterial\n  LEFT JOIN id_map id ON ram.RelatedObjects = id.ifc_id\n  WHERE m.Name IS NOT NULL AND m.Name != ''\n  GROUP BY m.Name\n),\nMaterialStats AS (\n  SELECT \n    Material_Name,\n    Material_Category,\n    Element_Relations,\n    Material_Relations,\n    Element_Types_Count,\n    Element_Types,\n    CASE \n      WHEN Element_Relations > 10 THEN 'High Usage'\n      WHEN Element_Relations > 5 THEN 'Medium Usage'\n      WHEN Element_Relations > 1 THEN 'Low Usage'\n      ELSE 'Minimal Usage'\n    END as Usage_Level,\n    CASE \n      WHEN Element_Types_Count > 5 THEN 'Multi-Purpose'\n      WHEN Element_Types_Count > 2 THEN 'Versatile'\n      WHEN Element_Types_Count > 1 THEN 'Limited'\n      ELSE 'Single Purpose'\n    END as Versatility_Level,\n    RANK() OVER (ORDER BY Element_Relations DESC) as Usage_Rank,\n    RANK() OVER (ORDER BY Element_Types_Count DESC) as Versatility_Rank\n  FROM MaterialAnalysis\n)\nSELECT \n  Material_Name,\n  Material_Category,\n  Element_Relations,\n  Material_Relations,\n  Element_Types_Count,\n  Element_Types,\n  Usage_Level,\n  Versatility_Level,\n  Usage_Rank,\n  Versatility_Rank,\n  CASE \n    WHEN Usage_Rank <= 3 THEN 'Top Material'\n    WHEN Usage_Rank <= 10 THEN 'Common Material'\n    ELSE 'Specialized Material'\n  END as Material_Importance\nFROM MaterialStats\nORDER BY Element_Relations DESC, Element_Types_Count DESC\nLIMIT 25;",
        icon: SparklesIcon,
        difficulty: "advanced",
        tags: ["materials", "properties", "correlation"]
      },
    ],
  },
  {
    category: "📊 Database Overview",
    description: "Quick insights into your IFC database",
    queries: [
      {
        name: "Database Overview",
        description: "Get a quick overview of your IFC database",
        sql: "SELECT 'Total Properties' as Metric, COUNT(*) as Count FROM psets\nUNION ALL\nSELECT 'Unique Elements' as Metric, COUNT(DISTINCT ifc_id) as Count FROM psets\nUNION ALL\nSELECT 'IFC Classes' as Metric, COUNT(DISTINCT ifc_class) as Count FROM id_map\nUNION ALL\nSELECT 'Property Sets' as Metric, COUNT(DISTINCT pset_name) as Count FROM psets;",
        icon: DatabaseIcon,
        difficulty: "beginner",
        tags: ["overview", "summary"]
      },
      {
        name: "IFC Classes Summary",
        description: "See what IFC element types are in your file",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nGROUP BY ifc_class\nORDER BY Count DESC;",
        icon: InfoIcon,
        difficulty: "beginner",
        tags: ["classes", "summary"]
      },
      {
        name: "Top IFC Classes",
        description: "Show the top IFC element types in your file",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nGROUP BY ifc_class\nORDER BY Count DESC\nLIMIT 10;",
        icon: InfoIcon,
        difficulty: "beginner",
        tags: ["top", "classes"]
      },
      {
        name: "Data Completeness",
        description: "Show how complete your property data is",
        sql: "SELECT\n  'Total Properties' as Metric, COUNT(*) as Count FROM psets\nUNION ALL\nSELECT 'Properties with Values' as Metric, COUNT(*) as Count FROM psets WHERE value IS NOT NULL AND value != ''\nUNION ALL\nSELECT 'Empty Properties' as Metric, COUNT(*) as Count FROM psets WHERE value IS NULL OR value = ''\nUNION ALL\nSELECT 'Data Completeness %' as Metric, ROUND((COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) * 100.0 / COUNT(*)), 1) as Count FROM psets;",
        icon: InfoIcon,
        difficulty: "beginner",
        tags: ["completeness", "statistics"]
      },
      {
        name: "Advanced Database Statistics",
        description: "Complex statistical analysis of database structure and content",
        sql: "WITH DatabaseStats AS (\n  SELECT \n    'Element Distribution' as Category,\n    id.ifc_class as Item,\n    COUNT(*) as Count,\n    COUNT(DISTINCT id.ifc_id) as Unique_Elements,\n    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as Percentage,\n    CASE \n      WHEN id.ifc_class LIKE '%Wall%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Slab%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Beam%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Column%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Door%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Window%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Roof%' THEN 'Enclosure'\n      WHEN id.ifc_class LIKE '%Floor%' THEN 'Enclosure'\n      ELSE 'Other'\n    END as Item_Category\n  FROM id_map id\n  GROUP BY id.ifc_class\n  UNION ALL\n  SELECT \n    'Property Distribution' as Category,\n    p.name as Item,\n    COUNT(*) as Count,\n    COUNT(DISTINCT p.ifc_id) as Unique_Elements,\n    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as Percentage,\n    CASE \n      WHEN p.name LIKE '%Length%' OR p.name LIKE '%Width%' OR p.name LIKE '%Height%' THEN 'Dimensional'\n      WHEN p.name LIKE '%Area%' OR p.name LIKE '%Volume%' THEN 'Geometric'\n      WHEN p.name LIKE '%Material%' OR p.name LIKE '%Type%' THEN 'Material'\n      WHEN p.name LIKE '%Fire%' OR p.name LIKE '%Safety%' THEN 'Safety'\n      ELSE 'General'\n    END as Item_Category\n  FROM psets p\n  WHERE p.name IS NOT NULL\n  GROUP BY p.name\n),\nRankedStats AS (\n  SELECT \n    Category,\n    Item,\n    Count,\n    Unique_Elements,\n    Percentage,\n    Item_Category,\n    RANK() OVER (PARTITION BY Category ORDER BY Count DESC) as Rank,\n    LAG(Count) OVER (PARTITION BY Category ORDER BY Count DESC) as Previous_Count,\n    Count - LAG(Count) OVER (PARTITION BY Category ORDER BY Count DESC) as Count_Difference,\n    ROUND(Count * 1.0 / Unique_Elements, 2) as Avg_Occurrences_Per_Element\n  FROM DatabaseStats\n)\nSELECT \n  Category,\n  Item,\n  Item_Category,\n  Count,\n  Unique_Elements,\n  Percentage,\n  Rank,\n  Previous_Count,\n  Count_Difference,\n  Avg_Occurrences_Per_Element,\n  CASE \n    WHEN Rank = 1 THEN 'Most Common'\n    WHEN Rank <= 3 THEN 'Very Common'\n    WHEN Rank <= 10 THEN 'Common'\n    WHEN Rank <= 20 THEN 'Occasional'\n    ELSE 'Rare'\n  END as Frequency_Classification\nFROM RankedStats\nORDER BY Category, Rank\nLIMIT 35;",
        icon: TrendingUpIcon,
        difficulty: "advanced",
        tags: ["statistics", "analysis", "distribution"]
      },
      {
        name: "Data Quality Assessment",
        description: "Advanced analysis of data quality and consistency patterns",
        sql: "WITH QualityMetrics AS (\n  SELECT \n    p.name as Property_Name,\n    COUNT(*) as Total_Occurrences,\n    COUNT(CASE WHEN p.value IS NOT NULL AND p.value != '' THEN 1 END) as Non_Null_Count,\n    COUNT(DISTINCT p.value) as Unique_Values,\n    COUNT(DISTINCT p.pset_name) as Property_Sets,\n    MIN(LENGTH(p.value)) as Min_Length,\n    MAX(LENGTH(p.value)) as Max_Length,\n    ROUND(AVG(LENGTH(p.value)), 1) as Avg_Length,\n    COUNT(CASE WHEN p.value LIKE '%mm%' OR p.value LIKE '%cm%' THEN 1 END) as Dimensional_Values,\n    COUNT(CASE WHEN CAST(p.value AS REAL) IS NOT NULL THEN 1 END) as Numeric_Values,\n    COUNT(CASE WHEN p.value IN ('0', '1', 'Yes', 'No', 'True', 'False') THEN 1 END) as Boolean_Values\n  FROM psets p\n  GROUP BY p.name\n),\nQualityAnalysis AS (\n  SELECT \n    Property_Name,\n    Total_Occurrences,\n    Non_Null_Count,\n    ROUND((Non_Null_Count * 100.0 / Total_Occurrences), 1) as Completeness_Percent,\n    Unique_Values,\n    Property_Sets,\n    Min_Length,\n    Max_Length,\n    Avg_Length,\n    Dimensional_Values,\n    Numeric_Values,\n    Boolean_Values,\n    ROUND((Dimensional_Values * 100.0 / Non_Null_Count), 1) as Dimensional_Percent,\n    ROUND((Numeric_Values * 100.0 / Non_Null_Count), 1) as Numeric_Percent,\n    ROUND((Boolean_Values * 100.0 / Non_Null_Count), 1) as Boolean_Percent,\n    CASE \n      WHEN Non_Null_Count = Total_Occurrences THEN 'Complete'\n      WHEN Non_Null_Count > Total_Occurrences * 0.8 THEN 'Good'\n      WHEN Non_Null_Count > Total_Occurrences * 0.5 THEN 'Fair'\n      ELSE 'Poor'\n    END as Quality_Status,\n    CASE \n      WHEN Dimensional_Values > Non_Null_Count * 0.5 THEN 'Dimensional'\n      WHEN Numeric_Values > Non_Null_Count * 0.5 THEN 'Numeric'\n      WHEN Boolean_Values > Non_Null_Count * 0.5 THEN 'Boolean'\n      ELSE 'Text'\n    END as Data_Type_Category\n  FROM QualityMetrics\n)\nSELECT \n  Property_Name,\n  Total_Occurrences,\n  Non_Null_Count,\n  Completeness_Percent,\n  Unique_Values,\n  Property_Sets,\n  Min_Length,\n  Max_Length,\n  Avg_Length,\n  Dimensional_Percent,\n  Numeric_Percent,\n  Boolean_Percent,\n  Quality_Status,\n  Data_Type_Category,\n  RANK() OVER (ORDER BY Completeness_Percent DESC, Total_Occurrences DESC) as Quality_Rank\nFROM QualityAnalysis\nWHERE Total_Occurrences >= 3\nORDER BY Quality_Rank\nLIMIT 30;",
        icon: InfoIcon,
        difficulty: "advanced",
        tags: ["quality", "assessment", "metrics"]
      },
    ],
  },
  {
    category: "🔍 Property Analysis",
    description: "Deep dive into property data and values",
    queries: [
      {
        name: "Available Properties",
        description: "See all available property names in the model",
        sql: "SELECT \n  p.name as Property_Name,\n  COUNT(*) as Count,\n  COUNT(DISTINCT p.pset_name) as Property_Sets,\n  COUNT(DISTINCT id.ifc_class) as IFC_Types\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.name IS NOT NULL AND p.name != ''\nGROUP BY p.name\nORDER BY Count DESC\nLIMIT 30;",
        icon: SearchIcon,
        difficulty: "intermediate",
        tags: ["properties", "names"]
      },
      {
        name: "Property Sets Overview",
        description: "Most common property sets and their usage",
        sql: "SELECT \n  p.pset_name as Property_Set,\n  COUNT(DISTINCT p.ifc_id) as Elements_Count,\n  COUNT(*) as Properties_Count,\n  COUNT(DISTINCT id.ifc_class) as IFC_Types\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nGROUP BY p.pset_name\nORDER BY Elements_Count DESC\nLIMIT 15;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["property-sets", "usage"]
      },
      {
        name: "Material Properties",
        description: "Show all IFC material entities and their usage",
        sql: "SELECT \n  m.Name as Material_Name,\n  'Material' as Material_Type,\n  CASE \n    WHEN m.Name LIKE '%Layer%' THEN 'Multi-Layer'\n    WHEN m.Name LIKE '%Set%' THEN 'Material Set'\n    ELSE 'Single Material'\n  END as Material_Category,\n  COUNT(DISTINCT ram.ifc_id) as Element_Relations,\n  COUNT(DISTINCT ram.RelatingMaterial) as Material_Relations,\n  GROUP_CONCAT(DISTINCT ram.RelatedObjects) as Related_Elements\nFROM IfcMaterial m\nLEFT JOIN IfcRelAssociatesMaterial ram ON m.ifc_id = ram.RelatingMaterial\nWHERE m.Name IS NOT NULL AND m.Name != ''\nGROUP BY m.Name\nORDER BY Element_Relations DESC, Material_Name\nLIMIT 20;",
        icon: SparklesIcon,
        difficulty: "intermediate",
        tags: ["materials", "properties"]
      },
      {
        name: "Common Property Patterns",
        description: "Find property names with common patterns",
        sql: "SELECT \n  p.name as Property_Name,\n  COUNT(*) as Count\nFROM psets p\nWHERE p.name IS NOT NULL AND p.name != ''\n  AND (LOWER(p.name) LIKE '%type%' OR LOWER(p.name) LIKE '%category%' OR LOWER(p.name) LIKE '%layer%' OR LOWER(p.name) LIKE '%class%')\nGROUP BY p.name\nORDER BY Count DESC\nLIMIT 25;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["patterns", "analysis"]
      },
      {
        name: "Fire Rating Properties",
        description: "Find elements with fire rating information",
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.pset_name as Property_Set,\n  p.name as Property_Name,\n  p.value as Fire_Rating\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.name LIKE '%Fire%' OR p.name LIKE '%Rating%' OR p.name LIKE '%fire%' OR p.name LIKE '%rating%'\nLIMIT 30;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["fire-rating", "safety"]
      },
      {
        name: "Advanced Property Correlation Analysis",
        description: "Complex analysis of property relationships and value patterns",
        sql: "WITH PropertyCorrelations AS (\n  SELECT \n    p1.name as Property_A,\n    p2.name as Property_B,\n    COUNT(*) as Co_Occurrences,\n    COUNT(DISTINCT p1.ifc_id) as Elements_Count,\n    COUNT(DISTINCT p1.value) as Unique_Values_A,\n    COUNT(DISTINCT p2.value) as Unique_Values_B,\n    COUNT(DISTINCT id.ifc_class) as Element_Types_Count,\n    GROUP_CONCAT(DISTINCT id.ifc_class) as Element_Types\n  FROM psets p1\n  JOIN psets p2 ON p1.ifc_id = p2.ifc_id AND p1.name < p2.name\n  LEFT JOIN id_map id ON p1.ifc_id = id.ifc_id\n  WHERE p1.value IS NOT NULL AND p2.value IS NOT NULL\n    AND p1.value != '' AND p2.value != ''\n  GROUP BY p1.name, p2.name\n  HAVING COUNT(*) >= 5\n),\nCorrelationAnalysis AS (\n  SELECT \n    Property_A,\n    Property_B,\n    Co_Occurrences,\n    Elements_Count,\n    Unique_Values_A,\n    Unique_Values_B,\n    Element_Types_Count,\n    Element_Types,\n    ROUND((Co_Occurrences * 100.0 / Elements_Count), 1) as Correlation_Strength,\n    ROUND((Unique_Values_A * 1.0 / Co_Occurrences), 2) as Value_Diversity_A,\n    ROUND((Unique_Values_B * 1.0 / Co_Occurrences), 2) as Value_Diversity_B,\n    CASE \n      WHEN Element_Types_Count = 1 THEN 'Single Element Type'\n      WHEN Element_Types_Count <= 3 THEN 'Few Element Types'\n      WHEN Element_Types_Count <= 10 THEN 'Multiple Element Types'\n      ELSE 'Many Element Types'\n    END as Element_Diversity,\n    RANK() OVER (ORDER BY Co_Occurrences DESC) as Correlation_Rank\n  FROM PropertyCorrelations\n)\nSELECT \n  Property_A,\n  Property_B,\n  Co_Occurrences,\n  Elements_Count,\n  Unique_Values_A,\n  Unique_Values_B,\n  Element_Types_Count,\n  Correlation_Strength,\n  Value_Diversity_A,\n  Value_Diversity_B,\n  Element_Diversity,\n  Correlation_Rank,\n  CASE \n    WHEN Correlation_Rank <= 3 THEN 'High Correlation'\n    WHEN Correlation_Rank <= 10 THEN 'Medium Correlation'\n    ELSE 'Low Correlation'\n  END as Correlation_Level\nFROM CorrelationAnalysis\nORDER BY Correlation_Rank\nLIMIT 25;",
        icon: TrendingUpIcon,
        difficulty: "advanced",
        tags: ["correlation", "relationships", "patterns"]
      },
      {
        name: "Property Value Distribution Analysis",
        description: "Advanced statistical analysis of property value distributions",
        sql: "WITH ValueStats AS (\n  SELECT \n    p.name as Property_Name,\n    p.value as Property_Value,\n    COUNT(*) as Frequency,\n    COUNT(*) OVER (PARTITION BY p.name) as Total_Count,\n    COUNT(DISTINCT p.ifc_id) as Unique_Elements,\n    COUNT(DISTINCT p.pset_name) as Property_Sets,\n    MIN(LENGTH(p.value)) as Min_Length,\n    MAX(LENGTH(p.value)) as Max_Length,\n    ROUND(AVG(LENGTH(p.value)), 1) as Avg_Length,\n    RANK() OVER (PARTITION BY p.name ORDER BY COUNT(*) DESC) as Value_Rank,\n    CASE \n      WHEN p.value LIKE '%mm%' OR p.value LIKE '%cm%' THEN 'Dimensional'\n      WHEN p.value LIKE '%C%' AND p.value LIKE '%/%' THEN 'Material Grade'\n      WHEN p.value IN ('0', '1', 'Yes', 'No', 'True', 'False') THEN 'Boolean'\n      WHEN CAST(p.value AS REAL) IS NOT NULL THEN 'Numeric'\n      ELSE 'Text'\n    END as Value_Type\n  FROM psets p\n  WHERE p.value IS NOT NULL AND p.value != '' AND LENGTH(p.value) > 0\n  GROUP BY p.name, p.value\n),\nDistributionAnalysis AS (\n  SELECT \n    Property_Name,\n    Property_Value,\n    Frequency,\n    Total_Count,\n    Unique_Elements,\n    Property_Sets,\n    Min_Length,\n    Max_Length,\n    Avg_Length,\n    Value_Rank,\n    Value_Type,\n    ROUND((Frequency * 100.0 / Total_Count), 1) as Percentage,\n    ROUND((Frequency * 1.0 / Unique_Elements), 2) as Frequency_Per_Element,\n    LAG(Frequency) OVER (PARTITION BY Property_Name ORDER BY Frequency DESC) as Previous_Frequency,\n    Frequency - LAG(Frequency) OVER (PARTITION BY Property_Name ORDER BY Frequency DESC) as Frequency_Difference,\n    CASE \n      WHEN Value_Rank = 1 THEN 'Most Common'\n      WHEN Value_Rank <= 3 THEN 'Common'\n      WHEN Value_Rank <= 10 THEN 'Occasional'\n      ELSE 'Rare'\n    END as Frequency_Category\n  FROM ValueStats\n)\nSELECT \n  Property_Name,\n  Property_Value,\n  Value_Type,\n  Frequency,\n  Total_Count,\n  Unique_Elements,\n  Property_Sets,\n  Min_Length,\n  Max_Length,\n  Avg_Length,\n  Value_Rank,\n  Percentage,\n  Frequency_Per_Element,\n  Previous_Frequency,\n  Frequency_Difference,\n  Frequency_Category,\n  RANK() OVER (ORDER BY Frequency DESC) as Global_Frequency_Rank\nFROM DistributionAnalysis\nWHERE Total_Count >= 3\nORDER BY Property_Name, Frequency DESC\nLIMIT 35;",
        icon: InfoIcon,
        difficulty: "advanced",
        tags: ["distribution", "statistics", "frequency"]
      },
    ],
  },
  {
    category: "📏 Dimensions & Quantities",
    description: "Analyze dimensional data and measurements",
    queries: [
      {
        name: "Element Dimensions",
        description: "Dimensional analysis of building elements",
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.name as Dimension_Type,\n  p.value as Value\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE (p.name LIKE '%Length%' OR p.name LIKE '%Width%' OR p.name LIKE '%Height%' OR p.name LIKE '%Area%' OR p.name LIKE '%Volume%' OR p.name LIKE '%length%' OR p.name LIKE '%width%' OR p.name LIKE '%height%' OR p.name LIKE '%area%' OR p.name LIKE '%volume%')\nAND p.value IS NOT NULL AND p.value != '' AND p.value != '0'\nORDER BY CAST(p.value AS REAL) DESC\nLIMIT 50;",
        icon: TrendingUpIcon,
        difficulty: "intermediate",
        tags: ["dimensions", "measurements"]
      },
      {
        name: "Sample Properties",
        description: "View a sample of actual property data",
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.pset_name as Property_Set,\n  p.name as Property_Name,\n  p.value as Property_Value\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.value IS NOT NULL AND p.value != ''\nLIMIT 20;",
        icon: InfoIcon,
        difficulty: "beginner",
        tags: ["sample", "data"]
      },
      {
        name: "Properties With Values",
        description: "Show properties that actually have values",
        sql: "SELECT \n  name as Property_Name,\n  value as Property_Value\nFROM psets\nWHERE value IS NOT NULL AND value != ''\nLIMIT 20;",
        icon: InfoIcon,
        difficulty: "beginner",
        tags: ["values", "data"]
      },
      {
        name: "Advanced Dimensional Analysis",
        description: "Complex analysis of dimensional relationships and geometric patterns",
        sql: "WITH DimensionalData AS (\n  SELECT \n    p.ifc_id,\n    id.ifc_class,\n    p.name as Dimension_Type,\n    p.value as Dimension_Value,\n    CASE \n      WHEN p.name LIKE '%Length%' OR p.name LIKE '%length%' THEN 'Length'\n      WHEN p.name LIKE '%Width%' OR p.name LIKE '%width%' THEN 'Width'\n      WHEN p.name LIKE '%Height%' OR p.name LIKE '%height%' THEN 'Height'\n      WHEN p.name LIKE '%Area%' OR p.name LIKE '%area%' THEN 'Area'\n      WHEN p.name LIKE '%Volume%' OR p.name LIKE '%volume%' THEN 'Volume'\n      ELSE 'Other'\n    END as Dimension_Category,\n    CASE \n      WHEN p.value LIKE '%mm%' THEN 'Millimeters'\n      WHEN p.value LIKE '%cm%' THEN 'Centimeters'\n      WHEN p.value LIKE '%m%' THEN 'Meters'\n      WHEN p.value LIKE '%ft%' OR p.value LIKE '%in%' THEN 'Imperial'\n      ELSE 'Unknown'\n    END as Unit_Type,\n    CAST(p.value AS REAL) as Numeric_Value\n  FROM psets p\n  JOIN id_map id ON p.ifc_id = id.ifc_id\n  WHERE p.value IS NOT NULL AND p.value != '' AND p.value != '0'\n    AND (p.name LIKE '%Length%' OR p.name LIKE '%Width%' OR p.name LIKE '%Height%' \n         OR p.name LIKE '%Area%' OR p.name LIKE '%Volume%')\n),\nDimensionalStats AS (\n  SELECT \n    ifc_class as Element_Type,\n    Dimension_Category,\n    Unit_Type,\n    COUNT(*) as Count,\n    COUNT(DISTINCT d.ifc_id) as Unique_Elements,\n    MIN(Numeric_Value) as Min_Value,\n    MAX(Numeric_Value) as Max_Value,\n    ROUND(AVG(Numeric_Value), 2) as Avg_Value,\n    COUNT(DISTINCT Dimension_Type) as Dimension_Types,\n    GROUP_CONCAT(DISTINCT Dimension_Type) as Available_Dimensions,\n    ROUND((MAX(Numeric_Value) - MIN(Numeric_Value)), 2) as Value_Range,\n    ROUND((MAX(Numeric_Value) - MIN(Numeric_Value)) / AVG(Numeric_Value) * 100, 1) as Range_Percentage\n  FROM DimensionalData d\n  WHERE Numeric_Value > 0\n  GROUP BY ifc_class, Dimension_Category, Unit_Type\n)\nSELECT \n  Element_Type,\n  Dimension_Category,\n  Unit_Type,\n  Count,\n  Unique_Elements,\n  Min_Value,\n  Max_Value,\n  Avg_Value,\n  Value_Range,\n  Range_Percentage,\n  Dimension_Types,\n  Available_Dimensions,\n  CASE \n    WHEN Range_Percentage < 50 THEN 'Low Variation'\n    WHEN Range_Percentage < 100 THEN 'Medium Variation'\n    WHEN Range_Percentage < 200 THEN 'High Variation'\n    ELSE 'Very High Variation'\n  END as Variation_Level,\n  RANK() OVER (ORDER BY Count DESC) as Usage_Rank\nFROM DimensionalStats\nORDER BY Usage_Rank, Element_Type, Dimension_Category\nLIMIT 30;",
        icon: TrendingUpIcon,
        difficulty: "advanced",
        tags: ["dimensions", "statistics", "geometry"]
      },
      {
        name: "Spatial Relationship Analysis",
        description: "Advanced analysis of spatial relationships and containment patterns",
        sql: "WITH SpatialRelations AS (\n  SELECT \n    p1.ifc_id as Element_ID,\n    id1.ifc_class as Element_Type,\n    p1.value as Element_Name,\n    p2.value as Parent_Element,\n    p3.value as Level_Name,\n    p4.value as Space_Name,\n    p5.value as Building_Name,\n    p6.value as Site_Name,\n    CASE \n      WHEN id1.ifc_class LIKE '%Wall%' THEN 'Structural'\n      WHEN id1.ifc_class LIKE '%Slab%' THEN 'Structural'\n      WHEN id1.ifc_class LIKE '%Beam%' THEN 'Structural'\n      WHEN id1.ifc_class LIKE '%Column%' THEN 'Structural'\n      WHEN id1.ifc_class LIKE '%Door%' THEN 'Opening'\n      WHEN id1.ifc_class LIKE '%Window%' THEN 'Opening'\n      WHEN id1.ifc_class LIKE '%Roof%' THEN 'Enclosure'\n      WHEN id1.ifc_class LIKE '%Floor%' THEN 'Enclosure'\n      ELSE 'Other'\n    END as Element_Category\n  FROM psets p1\n  JOIN id_map id1 ON p1.ifc_id = id1.ifc_id\n  LEFT JOIN psets p2 ON p1.ifc_id = p2.ifc_id AND p2.name = 'Parent'\n  LEFT JOIN psets p3 ON p1.ifc_id = p3.ifc_id AND p3.name = 'Level'\n  LEFT JOIN psets p4 ON p1.ifc_id = p4.ifc_id AND p4.name = 'Space'\n  LEFT JOIN psets p5 ON p1.ifc_id = p5.ifc_id AND p5.name = 'Building'\n  LEFT JOIN psets p6 ON p1.ifc_id = p6.ifc_id AND p6.name = 'Site'\n  WHERE p1.name IN ('Name', 'Description') AND p1.value IS NOT NULL\n),\nSpatialStats AS (\n  SELECT \n    Element_ID,\n    Element_Type,\n    Element_Category,\n    Element_Name,\n    Parent_Element,\n    Level_Name,\n    Space_Name,\n    Building_Name,\n    Site_Name,\n    COUNT(*) OVER (PARTITION BY Parent_Element) as Siblings_Count,\n    COUNT(*) OVER (PARTITION BY Level_Name) as Level_Count,\n    COUNT(*) OVER (PARTITION BY Space_Name) as Space_Count,\n    COUNT(*) OVER (PARTITION BY Building_Name) as Building_Count,\n    COUNT(*) OVER (PARTITION BY Element_Type) as Type_Count,\n    COUNT(*) OVER (PARTITION BY Element_Category) as Category_Count,\n    RANK() OVER (PARTITION BY Element_Type ORDER BY Element_Name) as Type_Rank,\n    RANK() OVER (PARTITION BY Element_Category ORDER BY Element_Name) as Category_Rank\n  FROM SpatialRelations\n)\nSELECT \n  Element_Type,\n  Element_Category,\n  Element_Name,\n  Parent_Element,\n  Level_Name,\n  Space_Name,\n  Building_Name,\n  Site_Name,\n  Siblings_Count,\n  Level_Count,\n  Space_Count,\n  Building_Count,\n  Type_Count,\n  Category_Count,\n  Type_Rank,\n  Category_Rank,\n  CASE \n    WHEN Siblings_Count > 10 THEN 'High Density'\n    WHEN Siblings_Count > 5 THEN 'Medium Density'\n    WHEN Siblings_Count > 1 THEN 'Low Density'\n    ELSE 'Isolated'\n  END as Density_Category,\n  CASE \n    WHEN Level_Count > 20 THEN 'Crowded Level'\n    WHEN Level_Count > 10 THEN 'Busy Level'\n    WHEN Level_Count > 5 THEN 'Moderate Level'\n    ELSE 'Sparse Level'\n  END as Level_Density,\n  RANK() OVER (ORDER BY Siblings_Count DESC, Level_Count DESC) as Spatial_Rank\nFROM SpatialStats\nWHERE Element_Name IS NOT NULL\nORDER BY Spatial_Rank\nLIMIT 30;",
        icon: LayersIcon,
        difficulty: "advanced",
        tags: ["spatial", "relationships", "containment"]
      },
    ],
  },
  {
    category: "🔧 Advanced Analysis",
    description: "Complex queries for detailed insights",
    queries: [
      {
        name: "Material Usage Summary",
        description: "Top materials and property values used across the building model",
        sql: "SELECT \n  m.Name as Material_Name,\n  'Material' as Material_Type,\n  CASE \n    WHEN m.Name LIKE '%Layer%' THEN 'Multi-Layer'\n    WHEN m.Name LIKE '%Set%' THEN 'Material Set'\n    ELSE 'Single Material'\n  END as Material_Category,\n  COUNT(DISTINCT ram.ifc_id) as Element_Relations,\n  COUNT(DISTINCT ram.RelatingMaterial) as Material_Relations,\n  GROUP_CONCAT(DISTINCT ram.RelatedObjects) as Related_Elements\nFROM IfcMaterial m\nLEFT JOIN IfcRelAssociatesMaterial ram ON m.ifc_id = ram.RelatingMaterial\nWHERE m.Name IS NOT NULL AND m.Name != ''\nGROUP BY m.Name\nORDER BY Element_Relations DESC, Material_Name\nLIMIT 20;",
        icon: SparklesIcon,
        difficulty: "advanced",
        tags: ["materials", "usage", "analysis"]
      },
      {
        name: "Most Common Property Values",
        description: "Show the most frequently occurring property values",
        sql: "SELECT \n  name as Property_Name,\n  value as Property_Value,\n  COUNT(*) as Occurrences\nFROM psets\nWHERE value IS NOT NULL AND value != ''\nGROUP BY name, value\nORDER BY Occurrences DESC\nLIMIT 20;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["common", "values", "frequency"]
      },
      {
        name: "Non-Empty Properties Analysis",
        description: "Find any properties with values (to understand data structure)",
        sql: "SELECT \n  p.name as Property_Name,\n  p.value as Sample_Value,\n  COUNT(*) as Total_Count\nFROM psets p\nWHERE p.value IS NOT NULL AND p.value != '' AND LENGTH(p.value) > 0\nGROUP BY p.name, p.value\nORDER BY Total_Count DESC\nLIMIT 15;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["analysis", "structure"]
      },
      {
        name: "Empty Properties Check",
        description: "Show properties that are NULL or empty (if any)",
        sql: "SELECT \n  name as Property_Name,\n  COUNT(*) as Count\nFROM psets\nWHERE value IS NULL OR value = ''\nGROUP BY name\nORDER BY Count DESC\nLIMIT 20;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["empty", "null", "data-quality"]
      },
      {
        name: "Property Distribution Debug",
        description: "Debug query to understand property distribution patterns",
        sql: "WITH PropertyCounts AS (\n  SELECT \n    p.name as Property_Name,\n    COUNT(*) as Total_Occurrences,\n    COUNT(CASE WHEN p.value IS NOT NULL AND p.value != '' THEN 1 END) as Non_Empty_Count,\n    COUNT(DISTINCT p.value) as Unique_Values,\n    COUNT(DISTINCT p.ifc_id) as Unique_Elements,\n    COUNT(DISTINCT p.pset_name) as Property_Sets,\n    MIN(LENGTH(p.value)) as Min_Length,\n    MAX(LENGTH(p.value)) as Max_Length,\n    ROUND(AVG(LENGTH(p.value)), 1) as Avg_Length\n  FROM psets p\n  GROUP BY p.name\n)\nSELECT \n  Property_Name,\n  Total_Occurrences,\n  Non_Empty_Count,\n  Unique_Values,\n  Unique_Elements,\n  Property_Sets,\n  Min_Length,\n  Max_Length,\n  Avg_Length,\n  ROUND((Non_Empty_Count * 100.0 / Total_Occurrences), 1) as Completeness_Percent,\n  ROUND((Unique_Values * 100.0 / Non_Empty_Count), 1) as Diversity_Percent,\n  CASE \n    WHEN Total_Occurrences >= 20 THEN 'High Frequency'\n    WHEN Total_Occurrences >= 10 THEN 'Medium Frequency'\n    WHEN Total_Occurrences >= 5 THEN 'Low Frequency'\n    ELSE 'Very Low Frequency'\n  END as Frequency_Category\nFROM PropertyCounts\nORDER BY Total_Occurrences DESC, Non_Empty_Count DESC\nLIMIT 25;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["debug", "distribution", "analysis"]
      },
      {
        name: "Material Data Debug",
        description: "Debug query to understand material data availability",
        sql: "SELECT \n  'Available Tables' as Category,\n  name as Table_Name,\n  'N/A' as Row_Count\nFROM sqlite_master \nWHERE type = 'table' AND name LIKE '%Material%'\nUNION ALL\nSELECT \n  'Material Data' as Category,\n  'IfcMaterial' as Table_Name,\n  CAST(COUNT(*) AS TEXT) as Row_Count\nFROM IfcMaterial\nUNION ALL\nSELECT \n  'Material Relations' as Category,\n  'IfcRelAssociatesMaterial' as Table_Name,\n  CAST(COUNT(*) AS TEXT) as Row_Count\nFROM IfcRelAssociatesMaterial\nUNION ALL\nSELECT \n  'Material Properties' as Category,\n  'Material Properties' as Table_Name,\n  CAST(COUNT(*) AS TEXT) as Row_Count\nFROM psets p\nJOIN IfcRelAssociatesMaterial ram ON p.ifc_id = ram.RelatedObjects\nJOIN IfcMaterial m ON ram.RelatingMaterial = m.ifc_id\nWHERE p.name IS NOT NULL AND p.value IS NOT NULL\nUNION ALL\nSELECT \n  'Sample Material Names' as Category,\n  m.Name as Table_Name,\n  CAST(COUNT(*) AS TEXT) as Row_Count\nFROM IfcMaterial m\nWHERE m.Name IS NOT NULL\nGROUP BY m.Name\nORDER BY Category, Row_Count DESC\nLIMIT 20;",
        icon: InfoIcon,
        difficulty: "intermediate",
        tags: ["debug", "materials", "tables"]
      },
      {
        name: "Advanced Pattern Recognition",
        description: "Complex analysis of naming patterns and data consistency",
        sql: "WITH PatternAnalysis AS (\n  SELECT \n    p.name as Property_Name,\n    p.value as Property_Value,\n    COUNT(*) as Frequency,\n    CASE \n      WHEN p.value LIKE '%_%' THEN 'Underscore Pattern'\n      WHEN p.value LIKE '%-%' THEN 'Dash Pattern'\n      WHEN p.value LIKE '% %' THEN 'Space Pattern'\n      WHEN LENGTH(p.value) = 0 THEN 'Empty'\n      WHEN LENGTH(p.value) = 1 THEN 'Single Char'\n      WHEN LENGTH(p.value) < 5 THEN 'Short'\n      WHEN LENGTH(p.value) > 50 THEN 'Long'\n      ELSE 'Standard'\n    END as Pattern_Type,\n    CASE \n      WHEN p.value GLOB '*[0-9]*' THEN 'Contains Numbers'\n      WHEN p.value GLOB '*[A-Z]*' THEN 'Contains Uppercase'\n      WHEN p.value GLOB '*[a-z]*' THEN 'Contains Lowercase'\n      ELSE 'Other'\n    END as Character_Type,\n    CASE \n      WHEN p.value LIKE '%mm%' OR p.value LIKE '%cm%' OR p.value LIKE '%m%' THEN 'Has Units'\n      WHEN p.value LIKE '%C%' AND p.value LIKE '%/%' THEN 'Material Grade'\n      WHEN p.value LIKE '%OKD%' OR p.value LIKE '%OKF%' THEN 'Level Reference'\n      WHEN p.value LIKE '%StB%' OR p.value LIKE '%Holz%' THEN 'Material Type'\n      ELSE 'Generic'\n    END as Content_Category\n  FROM psets p\n  WHERE p.value IS NOT NULL AND p.value != ''\n  GROUP BY p.name, p.value, Pattern_Type, Character_Type, Content_Category\n),\nPropertyStats AS (\n  SELECT \n    Property_Name,\n    Pattern_Type,\n    Character_Type,\n    Content_Category,\n    COUNT(*) as Pattern_Count,\n    SUM(Frequency) as Total_Frequency,\n    COUNT(DISTINCT Property_Value) as Unique_Values,\n    MIN(LENGTH(Property_Value)) as Min_Length,\n    MAX(LENGTH(Property_Value)) as Max_Length,\n    ROUND(AVG(LENGTH(Property_Value)), 1) as Avg_Length,\n    GROUP_CONCAT(DISTINCT Property_Value) as Sample_Values\n  FROM PatternAnalysis\n  GROUP BY Property_Name, Pattern_Type, Character_Type, Content_Category\n)\nSELECT \n  Property_Name,\n  Pattern_Type,\n  Character_Type,\n  Content_Category,\n  Pattern_Count,\n  Total_Frequency,\n  Unique_Values,\n  Min_Length,\n  Max_Length,\n  Avg_Length,\n  CASE \n    WHEN LENGTH(Sample_Values) > 100 THEN SUBSTR(Sample_Values, 1, 97) || '...'\n    ELSE Sample_Values\n  END as Sample_Values,\n  ROUND((Total_Frequency * 100.0 / SUM(Total_Frequency) OVER (PARTITION BY Property_Name)), 1) as Pattern_Percentage\nFROM PropertyStats\nWHERE Total_Frequency >= 3\nORDER BY Property_Name, Total_Frequency DESC, Pattern_Count DESC\nLIMIT 25;",
        icon: SearchIcon,
        difficulty: "advanced",
        tags: ["patterns", "recognition", "consistency"]
      },
      {
        name: "Complex Data Mining Query",
        description: "Advanced data mining with multiple analytical techniques",
        sql: "WITH DataMining AS (\n  SELECT \n    id.ifc_class as Element_Type,\n    p.name as Property_Name,\n    p.value as Property_Value,\n    COUNT(*) as Occurrences,\n    COUNT(DISTINCT p.ifc_id) as Unique_Elements,\n    COUNT(DISTINCT p.pset_name) as Property_Sets,\n    ROUND(AVG(LENGTH(p.value)), 1) as Avg_Length,\n    MIN(LENGTH(p.value)) as Min_Length,\n    MAX(LENGTH(p.value)) as Max_Length,\n    COUNT(DISTINCT p.value) as Unique_Values,\n    CASE \n      WHEN p.value LIKE '%mm%' OR p.value LIKE '%cm%' THEN 'Dimensional'\n      WHEN p.value LIKE '%C%' AND p.value LIKE '%/%' THEN 'Material Grade'\n      WHEN p.value IN ('0', '1', 'Yes', 'No', 'True', 'False') THEN 'Boolean'\n      WHEN CAST(p.value AS REAL) IS NOT NULL THEN 'Numeric'\n      ELSE 'Text'\n    END as Value_Type,\n    CASE \n      WHEN id.ifc_class LIKE '%Wall%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Slab%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Beam%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Column%' THEN 'Structural'\n      WHEN id.ifc_class LIKE '%Door%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Window%' THEN 'Opening'\n      WHEN id.ifc_class LIKE '%Roof%' THEN 'Enclosure'\n      WHEN id.ifc_class LIKE '%Floor%' THEN 'Enclosure'\n      ELSE 'Other'\n    END as Element_Category\n  FROM psets p\n  JOIN id_map id ON p.ifc_id = id.ifc_id\n  WHERE p.value IS NOT NULL AND p.value != ''\n  GROUP BY id.ifc_class, p.name, p.value\n),\nRankedData AS (\n  SELECT \n    Element_Type,\n    Element_Category,\n    Property_Name,\n    Property_Value,\n    Value_Type,\n    Occurrences,\n    Unique_Elements,\n    Property_Sets,\n    Avg_Length,\n    Min_Length,\n    Max_Length,\n    Unique_Values,\n    ROUND((Occurrences * 1.0 / Unique_Elements), 2) as Frequency_Per_Element,\n    ROUND((Unique_Values * 1.0 / Occurrences), 2) as Value_Diversity,\n    RANK() OVER (PARTITION BY Element_Type ORDER BY Occurrences DESC) as Occurrence_Rank,\n    RANK() OVER (PARTITION BY Property_Name ORDER BY Occurrences DESC) as Property_Rank,\n    RANK() OVER (PARTITION BY Element_Category ORDER BY Occurrences DESC) as Category_Rank,\n    NTILE(4) OVER (ORDER BY Occurrences) as Frequency_Quartile,\n    NTILE(4) OVER (ORDER BY Unique_Values) as Diversity_Quartile\n  FROM DataMining\n)\nSELECT \n  Element_Type,\n  Element_Category,\n  Property_Name,\n  Property_Value,\n  Value_Type,\n  Occurrences,\n  Unique_Elements,\n  Property_Sets,\n  Avg_Length,\n  Min_Length,\n  Max_Length,\n  Unique_Values,\n  Frequency_Per_Element,\n  Value_Diversity,\n  Occurrence_Rank,\n  Property_Rank,\n  Category_Rank,\n  Frequency_Quartile,\n  Diversity_Quartile,\n  CASE \n    WHEN Frequency_Quartile = 4 THEN 'High Frequency'\n    WHEN Frequency_Quartile = 3 THEN 'Medium-High Frequency'\n    WHEN Frequency_Quartile = 2 THEN 'Medium-Low Frequency'\n    ELSE 'Low Frequency'\n  END as Frequency_Category,\n  CASE \n    WHEN Diversity_Quartile = 4 THEN 'High Diversity'\n    WHEN Diversity_Quartile = 3 THEN 'Medium-High Diversity'\n    WHEN Diversity_Quartile = 2 THEN 'Medium-Low Diversity'\n    ELSE 'Low Diversity'\n  END as Diversity_Category\nFROM RankedData\nWHERE Occurrence_Rank <= 5 OR Property_Rank <= 5 OR Category_Rank <= 5\nORDER BY Element_Type, Occurrence_Rank, Property_Rank\nLIMIT 45;",
        icon: TrendingUpIcon,
        difficulty: "advanced",
        tags: ["data-mining", "analytics", "patterns"]
      },
    ],
  },
]

export function QueryInterface({ tables, entities, specialTables, psetStats, usePyodide, schema }: QueryInterfaceProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[] | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTablesOpen, setIsTablesOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [activeSidebarTab, setActiveSidebarTab] = useState<"tables" | "schema" | "ifc" | "properties">("tables")
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [expandedIfcClasses, setExpandedIfcClasses] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // Ref for the query editor textarea to enable smooth scrolling
  const queryEditorRef = useRef<HTMLTextAreaElement>(null)

  // Filter templates based on search and filters
  const filteredQueries = sampleQueries.map(category => ({
    ...category,
    queries: category.queries.filter(query => {
      const matchesSearch = !searchTerm ||
        query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesDifficulty = selectedDifficulty === "all" || query.difficulty === selectedDifficulty
      const matchesCategory = selectedCategory === "all" || category.category === selectedCategory

      return matchesSearch && matchesDifficulty && matchesCategory
    })
  })).filter(category => category.queries.length > 0)

  // Get unique categories for filter dropdown
  const categories = sampleQueries.map(cat => cat.category)

  // Helper functions for schema analysis
  const getTableSampleData = (tableName: string) => {
    const data = entities[tableName] || []
    return data.slice(0, 3) // First 3 rows
  }

  const getTableColumns = (tableName: string) => {
    // First try to get columns from actual database schema
    if (schema?.tables) {
      const tableDef = schema.tables.find((t: any) => t.name === tableName)
      if (tableDef?.columns) {
        return tableDef.columns.map((col: any) => col.name)
      }
    }

    // Fallback to sample data if schema not available
    const data = entities[tableName] || []
    if (data.length === 0) return []

    // Get actual column names from the first row
    const columns = Object.keys(data[0])

    // For IFC tables, ensure we have the correct primary key column name
    if (tableName.startsWith('Ifc') && columns.includes('id')) {
      // Replace 'id' with 'ifc_id' for IFC tables to match database schema
      return columns.map(col => col === 'id' ? 'ifc_id' : col)
    }

    return columns
  }

  const getIfcClassCounts = () => {
    const classCounts: Record<string, number> = {}
    tables.forEach(table => {
      if (table.startsWith('Ifc') && entities[table]) {
        classCounts[table] = entities[table].length
      }
    })
    return Object.entries(classCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20) // Top 20 classes
  }

  const getPropertySetStats = () => {
    // Try to get property set stats from specialTables first
    if (specialTables?.properties && Array.isArray(specialTables.properties)) {
      const psetCounts: Record<string, { count: number; properties: string[] }> = {}

      specialTables.properties.forEach((prop: any) => {
        if (prop.pset_name) {
          if (!psetCounts[prop.pset_name]) {
            psetCounts[prop.pset_name] = { count: 0, properties: [] }
          }
          psetCounts[prop.pset_name].count++
          if (prop.name && !psetCounts[prop.pset_name].properties.includes(prop.name)) {
            psetCounts[prop.pset_name].properties.push(prop.name)
          }
        }
      })

      return Object.entries(psetCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 15) // Top 15 property sets
    }

    // Fallback: return empty array if no data available
    return []
  }

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  const toggleIfcClassExpansion = (className: string) => {
    const newExpanded = new Set(expandedIfcClasses)
    if (newExpanded.has(className)) {
      newExpanded.delete(className)
    } else {
      newExpanded.add(className)
    }
    setExpandedIfcClasses(newExpanded)
  }

  const insertColumnIntoQuery = (tableName: string, columnName: string) => {
    const currentQuery = query.trim()

    // Validate that the column exists in the table
    if (!validateColumnExists(tableName, columnName)) {
      toast({
        title: "Column not found",
        description: `Column '${columnName}' does not exist in table '${tableName}'`,
        variant: "destructive",
      })
      return
    }

    // Get the actual database column name
    const actualColumnName = getActualColumnName(tableName, columnName)

    // If query is empty or doesn't start with SELECT, create a basic SELECT query
    if (!currentQuery || !currentQuery.toLowerCase().startsWith('select')) {
      setQuery(`SELECT ${actualColumnName} FROM ${tableName}`)
      return
    }

    // If query already has columns, append with comma
    if (currentQuery.toLowerCase().includes('from')) {
      // Insert before FROM clause
      const fromIndex = currentQuery.toLowerCase().indexOf('from')
      const beforeFrom = currentQuery.substring(0, fromIndex).trim()
      const afterFrom = currentQuery.substring(fromIndex)
      setQuery(`${beforeFrom}, ${actualColumnName} ${afterFrom}`)
    } else {
      // No FROM clause yet, just append
      setQuery(currentQuery + `, ${actualColumnName}`)
    }
  }

  const insertFilterIntoQuery = (tableName: string, columnName: string, filterType: string) => {
    const currentQuery = query.trim()

    // Validate that the column exists in the table
    if (!validateColumnExists(tableName, columnName)) {
      toast({
        title: "Column not found",
        description: `Column '${columnName}' does not exist in table '${tableName}'`,
        variant: "destructive",
      })
      return
    }

    // Get the actual database column name
    const actualColumnName = getActualColumnName(tableName, columnName)

    let filterClause = ''

    switch (filterType) {
      case 'not_null':
        filterClause = `${actualColumnName} IS NOT NULL`
        break
      case 'equals':
        filterClause = `${actualColumnName} = 'value'`
        break
      case 'like':
        filterClause = `${actualColumnName} LIKE '%pattern%'`
        break
      case 'greater':
        filterClause = `${actualColumnName} > 0`
        break
    }

    // If query is empty or doesn't start with SELECT, create a basic SELECT query
    if (!currentQuery || !currentQuery.toLowerCase().startsWith('select')) {
      setQuery(`SELECT * FROM ${tableName} WHERE ${filterClause}`)
      return
    }

    // If query already has WHERE clause, append with AND
    if (currentQuery.toLowerCase().includes('where')) {
      setQuery(currentQuery + ` AND ${filterClause}`)
    } else {
      // Add WHERE clause
      setQuery(currentQuery + ` WHERE ${filterClause}`)
    }
  }

  const executeQuery = async () => {
    if (!query.trim()) return

    console.log("[v0] Executing SQL query:", query)
    setIsExecuting(true)
    setError(null)
    setResults(null)

    try {
      if (!usePyodide.isInitialized) {
        throw new Error("Pyodide not initialized. Please process an IFC file first.")
      }

      if (!usePyodide.executeQuery) {
        throw new Error("Query execution not available")
      }

      const queryResults = await usePyodide.executeQuery(query.trim())
      console.log("[v0] Query results received:", queryResults)

      setResults(Array.isArray(queryResults) ? queryResults : [])

      toast({
        title: "Query executed successfully",
        description: `Returned ${Array.isArray(queryResults) ? queryResults.length : 0} rows`,
      })
    } catch (err) {
      console.error("[v0] Query execution error:", err)
      setError(err instanceof Error ? err.message : "Failed to execute query. Please check your SQL syntax.")
      toast({
        title: "Query failed",
        description: "Please check your SQL syntax and try again",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const loadSampleQuery = (sampleQuery: any) => {
    setQuery(sampleQuery.sql)
    setResults(null)
    setError(null)

    // Smooth scroll to the query editor
    if (queryEditorRef.current) {
      queryEditorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })

      // Focus the textarea for better UX
      setTimeout(() => {
        queryEditorRef.current?.focus()
      }, 500) // Small delay to let scroll animation complete
    }
  }

  const copyQuery = (sql: string) => {
    navigator.clipboard.writeText(sql)
    toast({
      title: "Query copied",
      description: "SQL query copied to clipboard",
    })
  }

  const clearQuery = () => {
    setQuery("")
    setResults(null)
    setError(null)
  }

  const debugSchema = () => {
    if (schema?.tables) {
      console.log('[QueryInterface] Database Schema:', schema)
      const ifcMaterialLayerSet = schema.tables.find((t: any) => t.name === 'IfcMaterialLayerSet')
      if (ifcMaterialLayerSet) {
        console.log('[QueryInterface] IfcMaterialLayerSet columns:', ifcMaterialLayerSet.columns)
      }

      // Log all material-related tables
      const materialTables = schema.tables.filter((t: any) =>
        t.name.includes('Material') || t.name.includes('material')
      )
      console.log('[QueryInterface] Material-related tables:', materialTables)

      materialTables.forEach((table: any) => {
        console.log(`[QueryInterface] ${table.name} columns:`, table.columns)
      })
    } else {
      console.log('[QueryInterface] No schema data available')
    }

    console.log('[QueryInterface] Special Tables:', specialTables)
    console.log('[QueryInterface] Property Set Stats:', getPropertySetStats())

    // Log actual material data structure
    if (specialTables?.materials && Array.isArray(specialTables.materials)) {
      console.log('[QueryInterface] Material data sample:', specialTables.materials.slice(0, 2))
      if (specialTables.materials.length > 0) {
        console.log('[QueryInterface] Material data columns:', Object.keys(specialTables.materials[0]))
      }
    }
  }

  const generateMaterialQuery = () => {
    if (!specialTables?.materials || !Array.isArray(specialTables.materials) || specialTables.materials.length === 0) {
      return "SELECT 'No material data available' as Message;"
    }

    const sampleMaterial = specialTables.materials[0]
    const columns = Object.keys(sampleMaterial)

    console.log('[QueryInterface] Available material columns:', columns)

    // Generate a simple query using the actual columns
    const selectColumns = columns.slice(0, 6).map(col => `${col} as ${col}`).join(',\n  ')

    return `SELECT \n  ${selectColumns}\nFROM (\n  SELECT ${columns.slice(0, 6).join(', ')} FROM IfcMaterial\n  UNION ALL\n  SELECT ${columns.slice(0, 6).join(', ')} FROM IfcMaterialLayer\n  UNION ALL\n  SELECT ${columns.slice(0, 6).join(', ')} FROM IfcMaterialLayerSet\n)\nLIMIT 20;`
  }

  const validateColumnExists = (tableName: string, columnName: string) => {
    // First try to validate against actual database schema
    if (schema?.tables) {
      const tableDef = schema.tables.find((t: any) => t.name === tableName)
      if (tableDef?.columns) {
        const dbColumns = tableDef.columns.map((col: any) => col.name)
        return dbColumns.includes(columnName)
      }
    }

    // Fallback to sample data validation
    const data = entities[tableName] || []
    if (data.length === 0) return false

    const actualColumns = Object.keys(data[0])

    // For IFC tables, check if columnName is 'ifc_id' but actual column is 'id'
    if (tableName.startsWith('Ifc') && columnName === 'ifc_id' && actualColumns.includes('id')) {
      return true
    }

    return actualColumns.includes(columnName)
  }

  const getActualColumnName = (tableName: string, displayColumnName: string) => {
    // First try to get actual column name from database schema
    if (schema?.tables) {
      const tableDef = schema.tables.find((t: any) => t.name === tableName)
      if (tableDef?.columns) {
        const dbColumns = tableDef.columns.map((col: any) => col.name)
        // If the display column exists in the database, use it as-is
        if (dbColumns.includes(displayColumnName)) {
          return displayColumnName
        }
        // For IFC tables, map 'ifc_id' to 'id' for database queries
        if (tableName.startsWith('Ifc') && displayColumnName === 'ifc_id' && dbColumns.includes('id')) {
          return 'id'
        }
      }
    }

    // Fallback to sample data logic
    const data = entities[tableName] || []
    if (data.length === 0) return displayColumnName

    const actualColumns = Object.keys(data[0])

    // For IFC tables, map 'ifc_id' to 'id' for database queries
    if (tableName.startsWith('Ifc') && displayColumnName === 'ifc_id' && actualColumns.includes('id')) {
      return 'id'
    }

    return displayColumnName
  }

  const getResultColumns = () => {
    if (!results || results.length === 0) return []
    return Object.keys(results[0])
  }

  const exportToCSV = () => {
    if (!results || results.length === 0) return
    const columns = getResultColumns()
    const headers = columns.join(",")
    const rows = results.map((row) =>
      columns
        .map((col) => {
          const value = row[col]
          if (value === null || value === undefined) return '""'
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(","),
    )
    const csv = [headers, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "query_results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToExcel = () => {
    if (!results || results.length === 0) return
    const worksheet = XLSX.utils.json_to_sheet(results)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results")
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "query_results.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToSQL = () => {
    if (!results || results.length === 0) return
    const columns = getResultColumns()
    let sqlDump = `-- Query Results Export\n-- Generated: ${new Date().toISOString()}\n\n`
    sqlDump += `CREATE TABLE query_results (${columns.map((c) => `${c} TEXT`).join(",")});\n\n`
    results.forEach((row) => {
      const values = columns
        .map((col) => `'${String(row[col]).replace(/'/g, "''")}'`)
        .join(", ")
      sqlDump += `INSERT INTO query_results (${columns.join(", ")}) VALUES (${values});\n`
    })
    const blob = new Blob([sqlDump], { type: "text/sql" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "query_results.sql"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Query Editor and Tables Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Query Editor */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
              <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-100">
                <div className="flex items-center space-x-2">
                  <DatabaseIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  <span>Advanced SQL Query Editor</span>
                </div>
                {query && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearQuery}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  ref={queryEditorRef}
                  placeholder="-- Enter your SQL query here
-- Example: SELECT * FROM IfcWall WHERE is_loadbearing = 'Yes' LIMIT 10;"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[250px] font-mono text-sm bg-slate-50 border border-slate-200 text-slate-900 transition-colors focus:bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:bg-slate-900"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={executeQuery}
                      disabled={!query.trim() || isExecuting}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      {isExecuting ? "Executing..." : "Execute Query"}
                    </Button>
                    {query.trim() && (
                      <Button
                        onClick={clearQuery}
                        variant="outline"
                        size="sm"
                        className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Clear
                      </Button>
                    )}
                    {results && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800">
                        ✓ {results.length} rows returned
                      </Badge>
                    )}
                  </div>
                </div>
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/50 dark:border-red-900">
                    <p className="text-sm text-red-700 font-medium dark:text-red-200">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Explorer Sidebar */}
        <div className="lg:col-span-1">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm text-slate-900 dark:text-slate-100">
                <div className="flex items-center space-x-2">
                  <DatabaseIcon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                  <span>Database Explorer</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-4">
                <button
                  onClick={() => setActiveSidebarTab("tables")}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeSidebarTab === "tables"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  Tables
                </button>
                <button
                  onClick={() => setActiveSidebarTab("schema")}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeSidebarTab === "schema"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  Schema
                </button>
                <button
                  onClick={() => setActiveSidebarTab("ifc")}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeSidebarTab === "ifc"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  IFC
                </button>
                <button
                  onClick={() => setActiveSidebarTab("properties")}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeSidebarTab === "properties"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  Props
                </button>
              </div>

              <ScrollArea className="h-[400px]">
                {/* Tables Tab */}
                {activeSidebarTab === "tables" && (
                  <div className="space-y-1">
                    {tables.map((table) => (
                      <div
                        key={table}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs hover:bg-slate-100 transition-colors dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100"
                      >
                        <span className="font-mono truncate">{table}</span>
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0 dark:border-slate-700 dark:text-slate-200">
                          {entities[table]?.length || 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Schema Explorer Tab */}
                {activeSidebarTab === "schema" && (
                  <div className="space-y-2">
                    {tables.slice(0, 10).map((table) => {
                      const columns = getTableColumns(table)
                      const isExpanded = expandedTables.has(table)
                      const sampleData = getTableSampleData(table)

                      return (
                        <div key={table} className="border rounded-lg dark:border-slate-700">
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => toggleTableExpansion(table)}
                          >
                            <div className="flex items-center space-x-2">
                              {isExpanded ? (
                                <ChevronDownIcon2 className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronRightIcon className="w-3 h-3 text-slate-500" />
                              )}
                              <TableIcon className="w-3 h-3 text-slate-500" />
                              <span className="font-mono text-xs font-medium">{table}</span>
                            </div>
                            <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-200">
                              {entities[table]?.length || 0}
                            </Badge>
                          </div>

                          {isExpanded && (
                            <div className="px-2 pb-2 space-y-2">
                              {/* Columns */}
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <ColumnsIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Columns</span>
                                </div>
                                <div className="space-y-1">
                                  {columns.slice(0, 5).map((column: string) => (
                                    <div key={column} className="flex items-center justify-between">
                                      <button
                                        onClick={() => insertColumnIntoQuery(table, column)}
                                        className="text-xs font-mono text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                      >
                                        {column}
                                      </button>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => insertFilterIntoQuery(table, column, 'not_null')}
                                          className="text-xs px-1 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-blue-200 hover:text-blue-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-blue-800 dark:hover:text-blue-200"
                                          title="IS NOT NULL"
                                        >
                                          ≠
                                        </button>
                                        <button
                                          onClick={() => insertFilterIntoQuery(table, column, 'like')}
                                          className="text-xs px-1 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-blue-200 hover:text-blue-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-blue-800 dark:hover:text-blue-200"
                                          title="LIKE pattern"
                                        >
                                          ~
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {columns.length > 5 && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      +{columns.length - 5} more columns
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Sample Data */}
                              {sampleData.length > 0 && (
                                <div>
                                  <div className="flex items-center space-x-1 mb-1">
                                    <EyeIcon className="w-3 h-3 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Sample</span>
                                  </div>
                                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                    {JSON.stringify(sampleData[0], null, 1).slice(0, 100)}...
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* IFC Class Browser Tab */}
                {activeSidebarTab === "ifc" && (
                  <div className="space-y-2">
                    {getIfcClassCounts().map(([className, count]) => {
                      const isExpanded = expandedIfcClasses.has(className)

                      return (
                        <div key={className} className="border rounded-lg dark:border-slate-700">
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => toggleIfcClassExpansion(className)}
                          >
                            <div className="flex items-center space-x-2">
                              {isExpanded ? (
                                <ChevronDownIcon2 className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronRightIcon className="w-3 h-3 text-slate-500" />
                              )}
                              <BuildingIcon className="w-3 h-3 text-slate-500" />
                              <span className="font-mono text-xs font-medium">{className}</span>
                            </div>
                            <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-200">
                              {count}
                            </Badge>
                          </div>

                          {isExpanded && (
                            <div className="px-2 pb-2 space-y-2">
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <ColumnsIcon className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Columns</span>
                                </div>
                                <div className="space-y-1">
                                  {getTableColumns(className).slice(0, 5).map((column: string) => (
                                    <div key={column} className="flex items-center justify-between">
                                      <button
                                        onClick={() => insertColumnIntoQuery(className, column)}
                                        className="text-xs font-mono text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                      >
                                        {column}
                                      </button>
                                      <button
                                        onClick={() => insertFilterIntoQuery(className, column, 'not_null')}
                                        className="text-xs px-1 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-blue-200 hover:text-blue-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-blue-800 dark:hover:text-blue-200"
                                        title="IS NOT NULL"
                                      >
                                        ≠
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <button
                                  onClick={() => setQuery(`SELECT * FROM ${className} LIMIT 10;`)}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                                >
                                  Quick Query
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Property Set Reference Tab */}
                {activeSidebarTab === "properties" && (
                  <div className="space-y-2">
                    {getPropertySetStats().length > 0 ? (
                      getPropertySetStats().map(([psetName, stats]: [string, any]) => (
                        <div key={psetName} className="border rounded-lg p-2 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-medium">{psetName}</span>
                            <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-200">
                              {stats.count}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {stats.properties?.slice(0, 3).join(', ')}
                            {stats.properties?.length > 3 && '...'}
                          </div>
                          <button
                            onClick={() => setQuery(`SELECT \n  pset_name as Property_Set,\n  name as Property_Name,\n  value as Property_Value,\n  ifc_id as Element_ID\nFROM psets\nWHERE pset_name = '${psetName}'\nLIMIT 20;`)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 mt-1"
                          >
                            Query Properties
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                        <InfoIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No property set data available</p>
                        <p className="text-xs mt-1">Property sets will appear here when IFC data is processed</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Query Results */}
      {results && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-900">
            <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-100">
              <span>Query Results</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  {results.length} rows × {getResultColumns().length} columns
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <DownloadIcon className="w-4 h-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileTextIcon className="w-4 h-4 mr-2" /> CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToExcel}>
                      <FileSpreadsheetIcon className="w-4 h-4 mr-2" /> Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToSQL}>
                      <FileCodeIcon className="w-4 h-4 mr-2" /> SQL
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white border-b-2 border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                    <TableRow>
                      {getResultColumns().map((column) => (
                        <TableHead
                          key={column}
                          className="font-semibold bg-slate-50 border-r last:border-r-0 whitespace-nowrap px-3 py-2 text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
                        >
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((row, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        {getResultColumns().map((column) => (
                          <TableCell
                            key={column}
                            className="font-mono text-sm border-r last:border-r-0 whitespace-nowrap px-3 py-2 dark:border-slate-800 dark:text-slate-200"
                          >
                            {String(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Templates */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm text-slate-900 dark:text-slate-100">
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span>Query Templates</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {filteredQueries.reduce((total, cat) => total + cat.queries.length, 0)} templates
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search and Filter Controls */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {filteredQueries.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {category.category}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {category.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {category.queries.map((sample, index) => {
                      const IconComponent = sample.icon
                      const difficultyColors: Record<string, string> = {
                        beginner: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                        intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                        advanced: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      }
                      return (
                        <div
                          key={index}
                          className="group relative p-4 border rounded-lg hover:bg-slate-50 transition-all duration-200 dark:border-slate-700 dark:hover:bg-slate-800/50 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900"
                          role="article"
                          aria-labelledby={`template-${categoryIndex}-${index}-title`}
                          aria-describedby={`template-${categoryIndex}-${index}-desc`}
                        >
                          {/* Header with icon and difficulty */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0" aria-hidden="true">
                              <IconComponent className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full font-medium ${difficultyColors[sample.difficulty]}`}
                              aria-label={`Difficulty level: ${sample.difficulty}`}
                            >
                              {sample.difficulty}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="space-y-2">
                            <h5
                              id={`template-${categoryIndex}-${index}-title`}
                              className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight"
                            >
                              {sample.name}
                            </h5>
                            <p
                              id={`template-${categoryIndex}-${index}-desc`}
                              className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed"
                            >
                              {sample.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1" role="list" aria-label="Template tags">
                              {sample.tags.slice(0, 2).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full dark:bg-slate-600 dark:text-slate-300"
                                  role="listitem"
                                >
                                  {tag}
                                </span>
                              ))}
                              {sample.tags.length > 2 && (
                                <span
                                  className="px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400"
                                  aria-label={`${sample.tags.length - 2} more tags`}
                                >
                                  +{sample.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyQuery(sample.sql)}
                              className="h-8 px-2 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex-1"
                              aria-label={`Copy query: ${sample.name}`}
                            >
                              <CopyIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                              Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadSampleQuery(sample)}
                              className="h-8 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 flex-1"
                              aria-label={`Use template: ${sample.name}`}
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {filteredQueries.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates found matching your criteria</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

    </div>
  )
}

