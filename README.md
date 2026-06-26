# Telemetry Architecture Review

A Cribl App Platform application that automates the discovery phase of the Telemetry Architecture Review Workshop. Scans a customer's Cribl environment (Stream, Edge, Search, Lake) and generates strategic and tactical recommendations.

## What It Does

- **Discovery** — Automatically scans all worker groups, sources, destinations, routes, and product adoption
- **Telemetry Snapshot** — Volumes, source/destination inventory, product usage at a glance
- **Risk Analysis** — Identifies single-destination dependency, cost concentration, resilience gaps
- **Recommendations** — Prioritized strategic recommendations with implementation steps
- **Opportunities** — Quick wins, per-source use case mapping, and cost/value modeling
- **Maturity Assessment** — L0-L4 maturity level with progression path and "Art of the Possible"
- **Deliverables** — Copy-ready Executive Summary, Future-State Architecture, and Snapshot documents

## Installation (Cribl Cloud)

### Step 1: Download the App Package

1. Go to the [Releases page](https://github.com/jperks-svg/TelemetryArchitectureReview/releases)
2. Download the latest `.tgz` file (e.g., `telemetryarchitecturereview-1.1.6.tgz`)

### Step 2: Upload to Your Cribl Cloud Instance

1. Log in to your Cribl Cloud instance
2. Navigate to the **App Store** (click the grid/apps icon in the top nav)
3. Click **"Upload App"** (top right)
4. Select the `.tgz` file you downloaded
5. Click **Install**

### Step 3: Launch the App

1. After installation, the app appears in your App Store under "Installed Apps"
2. Click **"Open"** to launch the Telemetry Architecture Review
3. Click **"Run Discovery"** on the landing page to scan your environment

That's it. The app runs entirely within your Cribl Cloud instance — no external dependencies, no data leaves your environment.

## Required Permissions

The app requests **read-only** access to the following APIs (declared in `config/policies.yml`):

| API Path | Purpose |
|----------|---------|
| `/master/groups` | Discover worker groups and fleets |
| `/master/groups/*/workers` | Count active Edge nodes |
| `/m/:gid/system/inputs` | List configured sources |
| `/m/:gid/system/outputs` | List configured destinations |
| `/m/:gid/system/status/inputs` | Source health status |
| `/m/:gid/system/status/outputs` | Destination health status |
| `/m/:gid/routes` | Route table for data flow mapping |
| `/m/:gid/pipelines` | Pipeline configuration |
| `/m/default_search/search/saved` | Search saved queries |
| `/m/default_search/search/jobs` | Search job history (usage frequency) |

No write access is required. The app only reads your configuration to generate analysis.

## Building from Source (Optional)

If you want to build the app yourself instead of using the pre-built release:

```bash
# Prerequisites: Node.js 18+
git clone https://github.com/jperks-svg/TelemetryArchitectureReview.git
cd TelemetryArchitectureReview
npm install
npm run package
```

The packaged `.tgz` will be in the `build/` directory. Upload it to Cribl Cloud using the steps above.

## Updating

To update to a new version:

1. Download the latest `.tgz` from [Releases](https://github.com/jperks-svg/TelemetryArchitectureReview/releases)
2. In Cribl Cloud, go to the App Store
3. Find "Telemetry Architecture Review" under Installed Apps
4. Click the menu (three dots) and select **"Update"**
5. Upload the new `.tgz` file

## FAQ

**Q: Does this app send any data externally?**
No. The app runs entirely within your Cribl Cloud sandbox. It only reads your local configuration APIs.

**Q: Will this affect my running pipelines?**
No. The app uses read-only API access. It cannot modify your configuration, routes, or pipelines.

**Q: What if I don't have Lake/Search/Edge?**
That's fine — the app will note which products are not adopted and include them in its recommendations as opportunities.

**Q: How long does discovery take?**
Typically 5-15 seconds depending on the number of worker groups configured.
