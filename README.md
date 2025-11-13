# DnD Spells Manager

## Description
This is a web application designed to help Dungeon Masters and players manage Dungeons & Dragons spells, character personas, and user accounts. It features a searchable spell list, persona-specific spell management, and administrative tools for managing users and approving new spell submissions.

## Features
-   **Spell Management:** Browse, search, and filter D&D spells.
-   **Persona System:** Create and manage character personas with custom spell lists.
-   **User Authentication:** Admin and sub-admin roles with PIN-based access.
-   **Spell Submission:** Users can submit new spells for admin approval.
-   **CSV Import:** Import spell data from CSV files.
-   **Theme Toggle:** Light and dark mode support.

## Technologies Used
-   **Frontend:** HTML, CSS, JavaScript
-   **Backend:** Node.js, Express.js
-   **Database:** SQLite3
-   **Authentication:** PIN-based hashing (SHA-256)
-   **Containerization:** Docker

## Setup and Installation

### Prerequisites
-   Node.js (v18 or higher recommended)
-   npm (Node Package Manager)
-   Docker (optional, for containerized deployment)

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd "DnD Spells"
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Database Initialization:**
    The SQLite database (`spells.db`) will be automatically created and initialized with an `admin` user (PIN: `0000`) on first server start.

### Running the Application

#### Local Development
```bash
npm start
```
This will start the Express.js server, typically on `http://localhost:3000`.

#### Docker
1.  **Build the Docker image:**
    ```bash
    docker build -t dnd-spells .
    ```
2.  **Run the Docker container:**
    ```bash
    docker run -p 3000:3000 dnd-spells
    ```
    The application will be accessible at `http://localhost:3000`.

## CSV Import

The application supports importing spell data via CSV files.

### CSV Format
-   The CSV file must include a header row.
-   The application will attempt to map common spell property names. Specifically:
    -   `Name` will be mapped to `Spell Name`
    -   `Details` will be mapped to `Description`
    -   `Upcast` will be mapped to `Higher Level`
    -   `Book` will be mapped to `Source`
-   A column for `Spell Name` (or `Name`) is mandatory for each spell entry.
-   **Available Columns:**
    -   `Spell Name` (mandatory)
    -   `Level`
    -   `School`
    -   `Casting Time`
    -   `Range`
    -   `Area`
    -   `Attack/Save`
    -   `Damage/Effect`
    -   `Ritual`
    -   `Concentration`
    -   `Components`
    -   `Duration`
    -   `Description`
    -   `Higher Level`
    -   `Classes`
    -   `WIKIDOT`
    -   `Source`

### Import Process
-   **Admin Users:** When an admin user imports a CSV, the system will attempt to add new spells or update existing ones. If a spell with the same name already exists but has different data, a conflict resolution modal will appear, allowing the admin to choose whether to keep the existing version or replace it with the imported data.
-   **Non-Admin Users (Personas):** If a non-admin user (i.e., a persona is selected) imports a CSV, the spells will be submitted for approval and will appear in the "Pending Approval" list for administrators to review.

## API Endpoints
The backend provides the following API endpoints:

-   `GET /api/spells`: Retrieve all global spells.
-   `GET /api/spells/:id`: Retrieve a specific spell by ID.
-   `PUT /api/spells/:id`: Update an existing spell (Admin only).
-   `POST /api/spells`: Add new spells (Admin only, batch update).
-   `DELETE /api/spells/:id`: Delete a spell (Admin only).

-   `GET /api/users`: Retrieve all users (Admin only).
-   `GET /api/users/:username`: Retrieve a specific user by username.
-   `PUT /api/users/:username`: Update a user's PIN (Admin only).
-   `POST /api/users`: Create a new user (Admin only, e.g., sub-admin).
-   `DELETE /api/users/:username`: Delete a user (Admin only).

-   `GET /api/personas`: Retrieve all personas.
-   `POST /api/personas`: Save persona data.

-   `GET /api/pending-spells`: Retrieve all pending spell submissions (Admin only).
-   `POST /api/pending-spells`: Submit a new spell for approval.
-   `POST /api/pending-spells/approve`: Approve a pending spell (Admin only).
-   `POST /api/pending-spells/reject`: Reject and delete a pending spell (Admin only).

## Usage
-   The application is deployed and can be used at: [https://dnd-spell-cards.onrender.com/](https://dnd-spell-cards.onrender.com/)
-   **Local Usage:** Open the application in your web browser (e.g., `http://localhost:3000`).
-   **Public View:** Browse spells, select a character persona, or submit a new spell for approval.
-   **Admin Dashboard:** Log in as an admin to manage global spells, pending submissions, users, and personas. The default admin username is `admin` with PIN `0000`.

## Contributing
Contributions are welcome! Please feel free to submit pull requests or open issues.

## Support
If you find this project helpful, please consider supporting its development:
-   [Buy Me a Coffee](https://www.buymeacoffee.com/theeox)

## License
MIT License

Copyright (c) 2025 eternity336

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
