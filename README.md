# Ivy Homes — Software Engineering Internship Assessment (September 2026)

- **Candidate Name**: Suresh Choudhary
- **Email**: suresh.20233281@mnnit.ac.in
- **Repository**: [https://github.com/sureshchoudhary2003/Assignment_project_Ivy_Home](https://github.com/sureshchoudhary2003/Assignment_project_Ivy_Home)
- **Live Demo**: [https://assignment-project-ivy-home-5upm1blxe.vercel.app](https://assignment-project-ivy-home-5upm1blxe.vercel.app)

---

## 1. How to Run It

### Running the Web Frontend Locally
```bash
cd ivy-homes-frontend
npm install
npm run dev
```
### Production Build
```bash
cd ivy-homes-frontend
npm run build
npm run preview
```

### Prerequisites
- Node.js (v18 or higher)
- npm


### Data Ingestion & Analysis
From the root directory:
```bash
# 1. Pull the full dataset from API (requires credentials in .env)
node pull-data.js

# 2. Run analysis and generate submission.json
node generate_complete_submission.js
