# 🎰 Lotto Game - Fullstack Application

A modern, fullstack lottery simulator built with **React** and **Spring Boot**. The application allows users to register, select lucky numbers, and check their winnings based on scheduled draws.

## 🚀 Project Overview
This repository contains the **Frontend** web application. To function correctly, it must communicate with the backend service.

* **Backend Repository:** [https://github.com/AgnieszkaMagura/Lotto.git](https://github.com/AgnieszkaMagura/Lotto.git)

---

## 🛠️ Infrastructure & Requirements
Before running the application, ensure you have the following installed and running:

1.  **Node.js** (for the frontend)
2.  **Docker Desktop** (to run the database and cache)
3.  **Java 17+** (to run the backend)

### Backend Dependencies:
The system relies on these services (managed via Docker):
* **MongoDB:** Stores user accounts and registered tickets.
* **Redis:** Handles result caching and session management.

---

## 🚦 Getting Started

### 1. Start Infrastructure
Navigate to your backend project directory and start the Docker containers:
```bash
docker-compose up -d
```

Verify that MongoDB (port 27017) and Redis (port 6379) are up and running.

### 2. Launch the Backend
Run the Spring Boot application through your IDE (e.g., IntelliJ) or via terminal:
```bash
./mvnw spring-boot:run
```
### 3. Launch the frontend
In this project directory, run the following commands:
```bash
npm install
npm start
```
The application will automatically open at http://localhost:3000.


## 💡 Key Features
* **Secure Auth:** JWT-based login and registration system.
* **Interactive UI:** Dynamic 1-99 number selection grid with "Quick Pick" feature.
* **Dark Mode:** Full support for light and dark themes with system persistence.
* **History Tracking:** Ticket purchase history saved per user in `localStorage`.
* **Real-time Results:** Automated winning checks with confetti animations for winners! 🎉

## 📅 Draw Schedule
* **Official Draws:** Every Saturday at 12:00 PM.
* **Verification:** You can check your ticket immediately after the draw is completed.

## ❓ Troubleshooting
* **Connection Error:** If you see "No response from server", ensure the backend is running on `http://localhost:8080`.
* **Empty History:** History is tied to the specific username and stored in your browser's local storage.
* **Docker Issues:** If the backend fails to start, run `docker ps` to check if MongoDB and Redis containers are active.
---
<p align="center">
  Developed with ❤️ by <strong>Agnieszka Magura</strong><br>
  <a href="https://github.com/AgnieszkaMagura" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/agnieszka-magura-0714241a8/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
</p>