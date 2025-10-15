# IFC Data Browser

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?logo=webassembly&logoColor=white)](https://webassembly.org/)
[![IfcOpenShell](https://img.shields.io/badge/IfcOpenShell-FF6B35?logo=python&logoColor=white)](https://ifcopenshell.org/)

A modern web application for exploring and analyzing IFC (Industry Foundation Classes) building model files. Transform complex BIM data into interactive SQL databases directly in your browser.

## 🚀 Features

- **Client-Side Processing**: 100% privacy-first: all processing happens in your browser
- **Multi-Format Support**: Compatible with IFC2X3 and IFC4 formats (IFC4X3 coming soon)
- **Interactive Database Viewer**: Browse, search, and query your IFC data as SQL tables
- **WebAssembly Powered**: Uses Pyodide and IfcOpenShell compiled to WebAssembly
- **Real-time Progress**: Live updates during file processing and conversion
- **Dark/Light Theme**: Modern UI with theme switching
- **Responsive Design**: Works on desktop and mobile devices
- **No Upload Required**: Files never leave your device

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [Privacy & Security](#-privacy--security)
- [Contributing](#-contributing)
- [License](#-license)
- [Resources](#-resources)

## 🎯 Quick Start

1. **Open the Application**: Navigate to the deployed application URL
2. **Upload IFC File**: Drag and drop or click to select your `.ifc` file
3. **Wait for Processing**: The app will convert your IFC file to a SQLite database
4. **Explore Data**: Browse tables, view entities, and run custom queries

That's it! No installation, no server setup, no data sharing.

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │────│  Pyodide Worker  │────│  IfcOpenShell   │
│   (React)       │    │  (WebAssembly)   │    │  (Python)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   SQLite DB     │
                       │   (In-Memory)   │
                       └─────────────────┘
```

### Core Components

- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **WebAssembly Runtime**: Pyodide for running Python in the browser
- **IFC Processing**: IfcOpenShell compiled to WebAssembly
- **Database**: SQLite compiled to WebAssembly for in-memory storage
- **UI Components**: Radix UI with custom styling

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS + Radix UI
- **Theme**: next-themes
- **File Upload**: react-dropzone

### Backend (Client-Side)
- **Runtime**: Pyodide (Python in WebAssembly)
- **IFC Library**: IfcOpenShell
- **Database**: SQLite (WebAssembly)
- **Geometry**: Shapely
- **Web Worker**: Multi-threaded processing

### Development
- **Build Tool**: Next.js
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Type Checking**: TypeScript

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- Modern web browser with WebAssembly support

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ifc-data-browser.git
   cd ifc-data-browser
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

## 📖 Usage

### Basic Workflow

1. **File Upload**
   - Drag and drop IFC files or click to browse
   - Supported formats: `.ifc` (IFC2X3, IFC4)
   - File size limit: Browser-dependent (typically 2GB+)

2. **Processing**
   - Real-time progress updates
   - Multiple processing steps:
     - Loading IFC file
     - Parsing entities
     - Building database schema
     - Converting to SQLite tables
     - Indexing for performance

3. **Data Exploration**
   - **Table Browser**: View all converted tables
   - **Entity Inspector**: Examine individual IFC entities
   - **SQL Query Interface**: Run custom queries
   - **Property Viewer**: Explore entity properties and relationships

### Example Queries

```sql
-- Find all walls
SELECT * FROM ifcwall;

-- Count entities by type
SELECT type, COUNT(*) as count
FROM entities
GROUP BY type
ORDER BY count DESC;

-- Find entities with specific properties
SELECT * FROM ifcwall
WHERE Name LIKE '%exterior%';
```

## 🔒 Privacy & Security

### Privacy First Design

- **Zero Data Transmission**: Files never leave your browser
- **Client-Side Processing**: All computation happens locally
- **No External Dependencies**: No API calls or server requests
- **No Tracking**: No analytics or user data collection

### Security Features

- **WebAssembly Sandbox**: Python code runs in secure WASM environment
- **No File System Access**: Cannot read/write local files
- **Memory-Only Storage**: Database exists only in browser memory
- **No Network Activity**: Confirmed via browser developer tools

### Verification

To verify privacy claims:
1. Open browser developer tools (F12)
2. Go to Network tab
3. Upload an IFC file
4. Confirm: 0 bytes uploaded, no external requests

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Project Structure

```
ifc-data-browser/
├── app/                    # Next.js app router
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   └── ...                # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── public/                # Static assets
│   └── ifc2sql.py        # Python IFC processing script
└── styles/               # Global styles
```

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### Key Points
- ✅ **Open Source**: Full source code available
- ✅ **Copyleft**: Modifications must be shared under same license
- ✅ **Network Use**: Network-accessible modifications must provide source
- ✅ **Commercial Use**: Allowed with license compliance

See [LICENSE](LICENSE) for full license text.

## 📚 Resources

### IFC & BIM
- [IFC Standards](https://standards.buildingsmart.org/IFC/) - Official IFC documentation
- [buildingSMART](https://www.buildingsmart.org/) - International BIM standards organization
- [IFC Schema Browser](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/) - Interactive schema documentation

### Tools & Libraries
- [IfcOpenShell](https://ifcopenshell.org/) - Core IFC processing library
- [Pyodide](https://pyodide.org/) - Python in WebAssembly
- [SQLite](https://www.sqlite.org/) - Database engine
- [Next.js](https://nextjs.org/) - React framework


## 🙏 Acknowledgments

- **IfcOpenShell**: For the incredible open-source IFC library
- **Pyodide Team**: For making Python available in browsers
- **buildingSMART**: For developing and maintaining IFC standards
- **Open Source Community**: For the tools and libraries that make this possible

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/louistrue/ifc-data-browser/issues)

or reach out...

---

**Made with ❤️ for the AEC industry**
