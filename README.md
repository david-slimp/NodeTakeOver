# Node Takeover

![Game Screenshot](screenshot.png)

A strategic territory control game where players compete to take over nodes on a dynamic gameboard. Build your forces, capture neutral nodes, and defeat your opponent in this engaging strategy game.

### Development

#### Development Server

During development, the application uses port `8000` by default. This is the standard port for local development.

To start the development server:

```bash
npm run dev
```

This will:
1. Build the application
2. Start a local server on port 8000
3. Automatically open the game in your default browser

If port 8000 is in use, the script will attempt to free it up. If that fails, you'll need to manually stop whatever is using port 8000.

### Building for Production

To create a production-ready build:

```bash
npm run build
```

This will create a `dist` directory with only the files needed to run the game.

### Deployment

The `dist` directory contains all necessary files to deploy the game to any static web hosting service. Here are some common deployment options:

#### GitHub Pages
1. Ensure your repository is pushed to GitHub
2. Go to your repository Settings > Pages
3. Set Source to "Deploy from a branch"
4. Select `gh-pages` branch and `/ (root)` folder
5. Click Save

The game will be available at `https://<your-username>.github.io/NodeTakeOver/`

#### Netlify
1. Drag and drop the `dist` folder to Netlify's drop zone
2. Or connect your GitHub repository and set the publish directory to `dist`

#### Vercel
1. Import your GitHub repository
2. Set the framework preset to "Static"
3. Set the output directory to `dist`
4. Deploy

### Manual Deployment
For manual deployment to any web server:
1. Run `npm run build`
2. Upload the contents of the `dist` directory to your web server
3. Ensure the server is configured to serve `index.html` for all routes (for client-side routing)

### Development vs Production Files
- **Development**: The root directory contains source files, configuration, and development tools
- **Production**: The `dist` directory contains only the minified and optimized files needed to run the game

### Updating the Game
1. Make your changes to the source files
2. Run `npm run build` to update the `dist` directory
3. Commit and push changes to your repository

## 🎮 Features

- **Strategic Gameplay**: Capture and control nodes to generate units and expand your territory
- **Computer AI**: Play against an AI opponent
- **Procedural Generation**: Unique game boards generated from seed values for endless replayability
- **Unit Management**: Generate and dispatch units to capture enemy nodes
- **Obstacle System**: Navigate around walls that block unit movement
- **Responsive Design**: Play on various screen sizes
- **Customizable Settings**: Adjust game parameters for different difficulty levels

## 🌐 Play Online

You can play the game online at: https://rock808.com/games/NodeTakeOver/

## 🎯 How to Play

1. **Objective**: Capture all enemy nodes on the board.
2. **Controls**:
   - Click on a node you control to select it
   - MouseDrag to an enemy or neutral node to send units to capture it
   - Use the seed input to replay specific game maps
   - Click "Restart" to begin a new game with the current seed

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for development)

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/david-slimp/NodeTakeOver.git
   cd NodeTakeOver
   ```

2. Open `index.html` in your web browser to start playing!

## 🛠 Development

### Project Structure

- `index.html` - Main game interface
- `main.js` - Game initialization and main loop
- `game.js` - Core game logic and state management
- `config.js` - Game configuration and constants
- `style.css` - Game styling



## 📝 License

This project is licensed under the GPL License - see the [LICENSE](LICENSE) file for details.

## 👏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

David Slimp - [rock808@David-Slimp.com](mailto:rock808@David-Slimp.com)

Project Link: [https://github.com/david-slimp/NodeTakeOver](https://github.com/david-slimp/NodeTakeOver)
