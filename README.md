# Movement Detroit Schedule

A modern, interactive schedule viewer for the Movement Detroit festival built with SvelteKit and Markwhen.

## Features

- **Grid View**: See all stages and time slots at a glance in a comprehensive grid layout
- **Timeline View**: Browse events chronologically across all stages
- **Real-time Highlights**: Currently playing events are highlighted with a pulsing animation
- **Responsive Design**: Works great on desktop and mobile devices
- **Stage Color Coding**: Each stage has its own color for easy identification
- **Markwhen Format**: Schedule data is stored in the human-readable Markwhen format

## Tech Stack

- **SvelteKit** - Modern web framework
- **Markwhen** - Timeline markup language and parser
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe development

## Development

To run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Schedule Data

The festival schedule is stored in `static/movement-schedule.markwhen`. The file uses Markwhen syntax to define events:

```markwhen
section Stage Name
2024-05-25 13:00-14:30: Artist Name
```

Each stage is defined as a section, and events are listed with their date, time range, and artist name.

## Building

To create a production version:

```bash
npm run build
npm run preview
```

## Deployment

This app is ready to deploy to Netlify with zero configuration needed.

### Deploy to Netlify

#### Option 1: Git Integration (Recommended)
1. Push your code to a GitHub repository
2. Go to [Netlify](https://netlify.com) and sign up/login
3. Click "New site from Git"
4. Connect your GitHub account and select the repository
5. Netlify will automatically detect the SvelteKit settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
6. Click "Deploy site"

#### Option 2: Manual Deploy
1. Run `npm run build` locally
2. Go to [Netlify](https://netlify.com) and login
3. Drag and drop the `build` folder to the deploy area

#### Custom Domain
To use a custom domain:
1. In your Netlify site settings, go to "Domain settings"
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

The app includes a `netlify.toml` configuration file that ensures:
- Proper SPA routing with redirects
- Node.js 18 environment
- Correct build settings

## License

This project is open source and available under the MIT License.
