# Contributing

Corrections are the most useful contribution. See [CORRECTIONS.md](CORRECTIONS.md).

- **Data errors**: open an issue naming the file and field in `public/data/`, the correct value and a primary source.
- **Relationship edges**: propose additions or fixes to `data/provenance/relationships_part_*.json` with a source URL, status and amount basis. Edges without a source are not accepted.
- **Methods**: open an issue first. Changes to models or the universe require a new methodology version and a research-log entry; planned and exploratory analyses stay separate.
- **Code**: run `npm run build`, `npm test`, `npm run e2e` and `pytest tests/research` before opening a pull request.

Do not commit raw price data, API keys or credentials.
