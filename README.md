# BlockParty

A modern GitHub bounty platform that connects developers with project maintainers through automated workflow management and Web3 integration.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/MakPr016/BlockParty)
[![Node.js](https://img.shields.io/badge/node.js-v18%2B-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-v18-blue)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## About

BlockParty is a comprehensive bounty marketplace that automates the entire workflow from bounty creation to contributor rewards. Built with modern web technologies and designed for seamless GitHub integration, it enables project maintainers to incentivize contributions while providing developers with opportunities to earn rewards for their work.

## Features

### Authentication & Security
- GitHub OAuth integration via Clerk
- Secure user authentication and session management
- Role-based access control for bounty creators and contributors

### Bounty Management
- Create bounties for any GitHub repository you own
- Automated webhook creation and management
- Task-based bounty structure with detailed requirements
- Prize configuration with multiple currency support
- Deadline management for time-sensitive projects

### Automated Workflow
- Real-time pull request monitoring via GitHub webhooks
- Automatic bounty completion when pull requests are merged
- Comprehensive contributor tracking with detailed metrics
- Complete audit trail of all repository events

### Dashboard & Analytics
- Personal dashboard for managing repositories
- Dedicated panel for tracking created bounties
- Public bounty marketplace for discovering opportunities
- Detailed contribution history with pull request analytics

### Modern Interface
- Responsive design optimized for all devices
- Dark/light theme toggle with smooth transitions
- Clean, professional UI built with shadcn/ui components
- Intuitive navigation and user experience

## Technology Stack

### Frontend
- **React 18** with Vite for fast development and hot reloading
- **TypeScript** for enhanced type safety and developer experience
- **Tailwind CSS** for efficient styling and responsive design
- **shadcn/ui** component library for consistent UI elements
- **Lucide React** for scalable vector icons
- **React Router** for client-side navigation

### Backend
- **Node.js** with Express.js framework
- **MongoDB** for flexible data persistence
- **Clerk** for robust authentication and user management
- **Octokit** for comprehensive GitHub API integration
- **GitHub Webhooks** for real-time repository event processing

### Infrastructure
- **GitHub OAuth** for secure user authentication
- **Automated webhook management** for repository monitoring
- **Real-time event processing** for instant bounty updates
- **RESTful API** architecture for scalable integrations

## Getting Started

### Prerequisites

Before running this application, ensure you have the following installed:

- Node.js 18.0 or higher
- npm or yarn package manager
- MongoDB (local installation or cloud service)
- GitHub account for OAuth integration
- Clerk account (free tier available)

### Installation

1. **Clone the repository**
```
git clone https://github.com/MakPr016/BlockParty.git  
cd BlockParty  
```

2. **Install backend dependencies**
```
cd backend  
npm install  
```
3. **Install frontend dependencies**
```
cd ../frontend
npm install
```


### Configuration

#### Backend Environment Variables

Create a `.env` file in the backend directory:
```
CLERK_PUBLISHABLE_KEY=  
CLERK_SECRET_KEY=  
PORT=  
MONGO_URI=  
WEBHOOK_CALLBACK_URL=  
```

#### Frontend Environment Variables

Create a `.env` file in the frontend directory:
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here  
VITE_API_URL=http://localhost:3000  
```


#### Clerk Configuration

1. Sign up for a free Clerk account at [clerk.com](https://clerk.com)
2. Create a new application in your Clerk dashboard
3. Enable GitHub as an OAuth provider
4. Add your development domain to the allowed origins
5. Copy your publishable and secret keys to the respective environment files

### Running the Application

1. **Start the backend server**
```
cd backend  
npm start  
```
The server will run on http://localhost:3000

2. **Start the frontend development server**
```
cd frontend  
npm run dev  
```

The frontend will run on http://localhost:5173

3. **Access the application**
Open your browser and navigate to http://localhost:5173

## Usage

### For Bounty Creators

1. **Authentication**: Sign in using your GitHub account
2. **Repository Access**: Navigate to the dashboard to view your repositories
3. **Webhook Setup**: Click "Create Bounty" on any repository you own to set up automated monitoring
4. **Bounty Configuration**: Define bounty details including:
- Clear title and comprehensive description
- Specific tasks and requirements
- Prize amount and preferred currency
- Optional deadline for completion
- Additional guidelines for contributors

### For Contributors

1. **Browse Opportunities**: Explore available bounties in the marketplace
2. **Apply for Bounties**: Submit applications for bounties matching your expertise
3. **Complete Work**: Create and submit pull requests to the target repository
4. **Automatic Rewards**: Receive automatic recognition and rewards when your contributions are merged

### Repository Management

The platform provides comprehensive repository management through:

- **Intelligent Webhook Management**: Automatically creates or reuses existing webhooks to avoid conflicts
- **Event Monitoring**: Tracks pushes, pull requests, issues, and comments in real-time
- **Automated Completion**: Marks bounties as completed when qualifying pull requests are merged
- **Detailed Analytics**: Provides insights into contribution patterns and repository activity

## Project Structure
```
BlockParty/
├── backend/
│ ├── server.js # Express server and API routes
│ ├── package.json # Backend dependencies
│ └── .env # Environment variables
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── pages/ # Application pages
│ │ ├── hooks/ # Custom React hooks
│ │ └── utils/ # Utility functions
│ ├── package.json # Frontend dependencies
│ └── .env # Environment variables
└── README.md # Project documentation
```


## API Documentation

### Authentication Endpoints
- `GET /health` - Health check and system status
- All protected routes require valid Clerk authentication

### Repository Management
- `GET /api/repositories` - Fetch user's repositories with admin access
- `POST /api/repositories/:owner/:repo/webhook` - Create or reuse repository webhook

### Bounty Operations
- `POST /api/bounties` - Create a new bounty
- `GET /api/bounties` - List all active bounties
- `GET /api/bounties/:id` - Get specific bounty details
- `POST /api/bounties/:id/apply` - Apply for a bounty
- `DELETE /api/bounties/:id` - Delete a bounty (owner only)

### Webhook Processing
- `POST /api/webhook/callback` - GitHub webhook event handler


## Development Roadmap

### Phase 1: Core Platform (Current)
- Basic bounty creation and management
- GitHub integration and webhook automation
- User authentication and authorization

### Phase 2: Web3 Integration (Upcoming)
- MetaMask wallet connection for existing users
- Cryptocurrency payment support
- Multi-token bounty rewards

### Phase 3: Advanced Features
- Team-based bounty completion
- Advanced analytics and reporting
- Reputation system for contributors and creators
- Email notification system

### Phase 4: Scale & Polish
- Mobile application development
- Performance optimizations
- Enhanced security features
- Community management tools

## Contributing

We welcome contributions from the community. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests if applicable
4. Commit your changes: `git commit -m 'Add some feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

Please ensure your code follows the existing style conventions and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for complete details.

## Support and Community

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/MakPr016/BlockParty/issues)
- **Discussions**: Join community discussions via [GitHub Discussions](https://github.com/MakPr016/BlockParty/discussions)
- **Documentation**: Additional documentation is available in the `/docs` directory

## Acknowledgments

This project builds upon excellent open-source technologies:

- [Clerk](https://clerk.com/) for authentication infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for component library
- [GitHub API](https://docs.github.com/en/rest) for repository integration
- [MongoDB](https://www.mongodb.com/) for data persistence
- [Vite](https://vitejs.dev/) for development tooling

