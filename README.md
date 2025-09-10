HR-PORTAL

Full-stack HR Leave & Tasks portal built for my graduation project.

Backend: ASP.NET Core Web API (hr-portal)

Frontend: React + Vite (hr-portal-web)

DB: SQL Server (EF Core)

📁 Project Structure
.
├─ hr-portal/               # .NET backend (Web API, EF Core, Migrations)
│  ├─ Controllers/
│  ├─ Application/ Domain/ Infrastructure/  # layered architecture
│  ├─ HrPortal.sln
│  └─ appsettings.json
├─ hr-portal-web/           # React (Vite) frontend
│  ├─ src/
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
└─ README.md

🚀 Quick Start (Dev)
1) Backend (.NET)

From hr-portal/:

# restore & build
dotnet restore
dotnet build

# (optional) update DB if migrations exist
# dotnet ef database update

# run API (default https://localhost:5001 or http://localhost:5000)
dotnet run


Set your connection string in hr-portal/appsettings.Development.json:

{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=HrPortalDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Logging": { "LogLevel": { "Default": "Information" } },
  "AllowedHosts": "*"
}


(If you use a different SQL instance, adjust accordingly.)

2) Frontend (React + Vite)

From hr-portal-web/:

npm install


Create an .env file in hr-portal-web/:

VITE_API_BASE_URL=https://localhost:5001


Run dev server:

npm run dev


Vite will start on http://localhost:5173 and call the API at VITE_API_BASE_URL.

🔧 Production Build

Frontend (build static files):

cd hr-portal-web
npm run build


Outputs to hr-portal-web/dist.

Backend (publish):

cd hr-portal
dotnet publish -c Release -o ./publish

Deploy options

Separate deploys: host API (IIS/Azure/App Service/Docker) + host dist/ on static hosting (Netlify/Vercel/Nginx).

Single deploy via ASP.NET: copy hr-portal-web/dist into a static folder served by the API (e.g., wwwroot) and map fallback to index.html.

🔐 Environment Variables

Backend (hr-portal):

ConnectionStrings__DefaultConnection

ASPNETCORE_ENVIRONMENT (Development/Production)

ASPNETCORE_URLS (optional override)

Frontend (hr-portal-web):

VITE_API_BASE_URL

🧰 Tech Stack

.NET 8 (Web API), EF Core

React 18, Vite

TypeScript

SQL Server (LocalDB in dev)

🌐 CORS (Dev)

If the frontend calls https://localhost:5001 from http://localhost:5173, ensure CORS is enabled in the API startup configuration, e.g.:

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

app.UseCors("Frontend");

▶️ Common Scripts

Frontend

npm run dev – start Vite

npm run build – production build

npm run preview – serve built files locally

Backend

dotnet run – run API

dotnet ef migrations add <Name> – add migration

dotnet ef database update – apply migrations

✅ Status

This repository contains the complete source for the backend and frontend used in my graduation thesis.