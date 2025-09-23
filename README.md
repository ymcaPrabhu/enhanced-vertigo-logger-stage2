# Vertigo Logger - Stage 1 MVP

A Rust-based web application for logging and analyzing vertigo episodes with AI assistance.

## Features

✅ **Episode Logging**: Record vertigo episodes with detailed information
✅ **Voice Input**: Speech-to-text for symptom description
✅ **AI Analysis**: OpenRouter integration for episode analysis
✅ **Web Interface**: Modern, responsive web UI
✅ **Data Export**: CSV export for medical consultation
✅ **SQLite Database**: Reliable local data storage

## Quick Start

### One-Click Installation

```bash
./scripts/install-stage1.sh
```

### Manual Installation

1. **Install Dependencies** (Termux):
   ```bash
   pkg install rust sqlite git curl
   ```

2. **Build Project**:
   ```bash
   cargo build --release
   ```

3. **Setup Database**:
   ```bash
   sqlite3 vertigo.db < migrations/001_create_episodes.sql
   ```

4. **Run Application**:
   ```bash
   ./target/release/vertigo-logger
   ```

5. **Access Web Interface**:
   Open http://localhost:3000 in your browser

## API Endpoints

- `GET /health` - Health check
- `GET /api/episodes` - List all episodes
- `POST /api/episodes` - Create new episode
- `GET /api/episodes/{id}` - Get specific episode
- `PUT /api/episodes/{id}` - Update episode
- `DELETE /api/episodes/{id}` - Delete episode
- `POST /api/analyze` - AI analysis of symptoms
- `GET /api/export` - Export data as CSV

## Configuration

### Environment Variables

- `DATABASE_URL` - SQLite database path (default: "vertigo.db")
- `OPENROUTER_API_KEY` - OpenRouter API key for AI analysis
- `OPENROUTER_BASE_URL` - OpenRouter API base URL

### AI Integration

For real AI analysis, set your OpenRouter API key:

```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

Without an API key, the app uses mock responses for testing.

## Testing

### Run Unit Tests
```bash
cargo test
```

### Run Feature Tests
```bash
./scripts/test-features-stage1.sh
```

### Validate Installation
```bash
./scripts/install-stage1.sh
```

## Project Structure

```
├── src/
│   ├── main.rs           # Application entry point
│   ├── models.rs         # Data models
│   ├── handlers.rs       # HTTP handlers
│   ├── database.rs       # Database operations
│   ├── ai_service.rs     # AI integration
│   └── schema.rs         # Database schema
├── static/
│   ├── index.html        # Web interface
│   ├── app.js            # Frontend JavaScript
│   └── style.css         # Styling
├── migrations/
│   └── 001_create_episodes.sql
├── scripts/
│   ├── install-stage1.sh # One-click installer
│   └── test-features-stage1.sh # Feature tests
├── tests/
│   └── integration_tests.rs
└── Cargo.toml
```

## Dependencies

Minimal set of high-quality Rust crates:

- **axum** - Web framework
- **tokio** - Async runtime
- **diesel** - ORM for SQLite
- **serde** - Serialization
- **reqwest** - HTTP client
- **chrono** - Date/time handling

## Development

### Adding New Features

1. Update database schema in `migrations/`
2. Add models in `src/models.rs`
3. Implement handlers in `src/handlers.rs`
4. Add frontend functionality in `static/`
5. Write tests in `tests/`

### Database Migrations

```bash
# Create new migration
diesel migration generate migration_name

# Run migrations
diesel migration run
```

## License

MIT License - see LICENSE file for details.

## Medical Disclaimer

This application is for informational purposes only and should not replace professional medical advice. Always consult healthcare providers for medical concerns.