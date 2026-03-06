# 3D GitHub Town 🏙️

An interactive 3D visualization of GitHub profiles as buildings in a virtual town. Explore GitHub users where each building represents a developer, with height, width, and depth based on their GitHub statistics.

## Features

- 🏗️ **10 Default Buildings** - Town loads with popular GitHub developers
- 🎮 **Full 3D Navigation** - WASD to move, mouse drag to look around
- 🏷️ **Username Labels** - Each building displays the GitHub username on top
- 🎨 **Dynamic Visuals** - Building dimensions based on repos, followers, and following
- 💫 **Glowing Effects** - Pulsing windows and unique colors per user
- 🔍 **Search & Click** - Search for any GitHub user and click buildings for details

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Setup GitHub Token (Optional but Recommended)**

   To avoid API rate limits, create a GitHub Personal Access Token:
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Click "Generate new token" (classic)
   - No scopes needed for public data - just give it a name and create
   - Copy the token

   Then create a `.env` file:

   ```bash
   cp .env.example .env
   ```

   And add your token:

   ```
   VITE_GITHUB_TOKEN=your_github_token_here
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Controls

- **W/A/S/D** - Move forward/left/backward/right
- **Mouse Drag** - Look around (rotate camera)
- **Click Building** - View user profile details
- **Search Bar** - Add more GitHub users to the town

## Tech Stack

- **React** - UI framework
- **Three.js** - 3D graphics engine
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **GitHub API** - User data

## How It Works

Each building's dimensions are calculated from GitHub stats:

- **Height** - Based on followers (logarithmic scale)
- **Width** - Based on public repositories
- **Depth** - Based on following count
- **Color** - Unique per username (hash-based)

---

Generated with AI App Builder
