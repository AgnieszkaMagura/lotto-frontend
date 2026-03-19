# 🎰 Lotto Game - Fullstack Application

A modern, fullstack lottery simulator built with **React**, **TypeScript**, and **Spring Boot**. The application allows users to register, select lucky numbers, and check their winnings based on scheduled draws with real-time feedback.

## 🚀 Project Overview
This repository contains the **Frontend** web application. To function correctly, it must communicate with the backend service.

* **Backend Repository:** [https://github.com/AgnieszkaMagura/Lotto.git](https://github.com/AgnieszkaMagura/Lotto.git)

---
## 📖 How to Play
Once the application is running, follow these steps to participate in a draw:

1. **🎯 Select Numbers:** Pick 6 lucky numbers from the 1-99 grid or use the "QUICK PICK" button for a random selection.

2. **🚀 Register Ticket:** Click the "REGISTER TICKET" button to submit your numbers for the upcoming draw.

3. **🕒 Wait for Draw:** Check the live countdown. Official draws take place every Saturday at 12:00 PM.

4. **🔍 Check Results:** Go to your "Purchase History", copy your unique Ticket ID, and use it to verify your winnings after the draw.
---
## 📋 Purchase History & Tracking
The application features a dedicated history panel where users can manage their participation:
* **Ticket Archiving:** Every registered ticket is automatically saved to the user's local history.
* **Quick Actions:** One-click "Copy ID" functionality to easily move Ticket IDs to the verification tool.
* **Draw Details:** Each entry displays the specific draw date and the numbers selected by the user.
* **Session Persistence:** History is tied to the logged-in username and persists across browser restarts.
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
```
```bash
npm start
```
The application will automatically open at http://localhost:3000.

## 🖼️ Visuals (Gallery)

| Feature | Light Mode | Dark Mode |
|:---:|:---:|:---:|
| **Login & Auth** | <img width="2434" height="1424" alt="2" src="https://github.com/user-attachments/assets/1c592731-efa6-4c2d-9082-3442a0746b94" /> | <img width="2410" height="1422" alt="21" src="https://github.com/user-attachments/assets/de68ec52-291a-40d1-8fa2-ec1914e697fb" /> |
| **Main Dashboard** | <img width="2420" height="1420" alt="22" src="https://github.com/user-attachments/assets/bb972d99-f26a-454e-b4a5-8ec1babad46d" /> | <img width="2414" height="1424" alt="26" src="https://github.com/user-attachments/assets/730041d4-0b8b-40f6-9503-b23f300798b4" /> | 
| **Ticket Registration & Countdown** | <img width="2394" height="1420" alt="23" src="https://github.com/user-attachments/assets/0d078533-afe6-427f-ae3b-fc951132c033" /> | <img width="2414" height="1424" alt="25" src="https://github.com/user-attachments/assets/2d3d0e69-222e-437d-9ec8-bad37646ddd6" /> |  
| **Purchase History** | <img width="2420" height="1420" alt="24" src="https://github.com/user-attachments/assets/4adece15-d241-4493-8b70-c3ffac16bb14" /> | <img width="2880" height="1692" alt="1" src="https://github.com/user-attachments/assets/6ff43a6c-9567-4abd-8064-2a2c698fd0c3" /> |
| **Winning (3+ Hits) & Confetti** |  <img width="2880" height="1694" alt="2" src="https://github.com/user-attachments/assets/64801bab-4132-4425-83b2-55aadeff0f80" /> | <img width="2422" height="1420" alt="28" src="https://github.com/user-attachments/assets/2284c688-397c-4ee5-840b-7948ef96040e" />  |
| **No Win Scenario** | <img width="2420" height="1420" alt="33" src="https://github.com/user-attachments/assets/a8a0cf2f-9f36-4280-9058-fc151dd168dc" /> | <img width="2856" height="1692" alt="34" src="https://github.com/user-attachments/assets/044ea1da-8263-4c5a-8f74-c38b5e6cd49c" /> |

## 💡 Key Features
* **🔐 Advanced Auth:** Secure JWT-based login/registration with strict password validation (min 6 chars, uppercase, and special symbols).
* **⏳ Live Draw Countdown:** Real-time clock counting down to the next official draw.
* **🎭 Interactive UI:** Dynamic 1-99 number selection grid with a built-in "Quick Pick" algorithm.
* **🌓 Theme Support:** Full Light and Dark mode integration with persistent user preference using `data-theme`.
* **📋 Purchase History:** A comprehensive tracking system where users can view past tickets, draw dates, and use a one-click "Copy ID" feature.
* **🎉 Winner Experience:** Automated winning verification with custom Confetti animations scaling with your winnings!
* **💾 Persistent Storage:** User sessions, theme preferences, and game history are saved in `localStorage` for a seamless experience.

## 🏗️ Backend Architecture & Security
The backend is built following the **Modular Monolith** approach with **Hexagonal Architecture** principles. This ensures a strict separation between business logic and infrastructure, using **Facades** to encapsulate module internal logic.

<img width="6557" height="6623" alt="lotto architecture security v2" src="https://github.com/user-attachments/assets/8fe62ad8-c962-430e-abea-5ad17b7d40d4" />

### 🧩 Logic & Security Flow
The diagram above illustrates the request flow through security filters and how independent modules interact via their Facades:

### 🔒 Security Layer (Red)
* **Access Rules:** Centralized endpoint security management in `SecurityConfig`.
* **Token Validation:** Every request is intercepted by `JwtAuthTokenFilter` to validate the JWT and set the authentication context.
* **Authentication:** `JwtAuthenticatorFacade` orchestrates the login process and generates secure tokens.

### 🟢 Domain Logic & Facades (Green)
* **Number Receiver:** Validates user numbers and registers tickets for draws.
* **Winning Generator:** Fetches winning numbers from an external API via a **Remote HTTP Client**.
* **Result Checker:** Compares user tickets with winning numbers using isolated domain rules.
* **Result Announcer:** Handles the logic of informing users about their winnings through a dedicated facade.

### 🔵 Infrastructure & Adapters (Blue)
* **MongoDB:** Primary persistent storage for user accounts and registered tickets.
* **Redis:** High-performance cache for storing draw results and session data to optimize system response time.
---

## 📅 Draw Schedule
* **Official Draws:** Every Saturday at 12:00 PM.
* **Verification:** You can check your ticket immediately after the draw is completed using your unique Ticket ID.

## ❓ Troubleshooting
* **Connection Error:** If you see "No response from server", ensure the backend is running on `http://localhost:8080`.
* **Empty History:** History is tied to the specific username and stored in your browser's local storage.
* **Docker Issues:** If the backend fails to start, run `docker ps` to check if MongoDB and Redis containers are active.
---

<p align="center">
  <strong>💻 Frontend Stack</strong><br>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
</p>

<p align="center">
  <strong>🛠️ Backend Tech Stack</strong><br>
  <img src="https://img.shields.io/badge/Architecture-Hexagonal-3498db?style=for-the-badge&logo=architecture" alt="Hexagonal Architecture">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17">
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot">
  <img src="https://img.shields.io/badge/Lombok-bc473a?style=for-the-badge&logo=java&logoColor=white" alt="Lombok">
  <img src="https://img.shields.io/badge/Bean-Validation-009688?style=for-the-badge" alt="Bean Validation">
  <img src="https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=spring-security&logoColor=white" alt="Spring Security">
  <img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=json-web-tokens&logoColor=white" alt="JWT">
  <br>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

<p align="center">
  <strong>🧪 Testing Tools</strong><br>
  <img src="https://img.shields.io/badge/JUnit5-25A162?style=for-the-badge&logo=junit5&logoColor=white" alt="JUnit5">
  <img src="https://img.shields.io/badge/Mockito-ff9c1e?style=for-the-badge" alt="Mockito">
  <img src="https://img.shields.io/badge/Testcontainers-61696e?style=for-the-badge&logo=testcontainers&logoColor=white" alt="Testcontainers">
  <img src="https://img.shields.io/badge/Wiremock-000000?style=for-the-badge&logo=wiremock&logoColor=white" alt="Wiremock">
  <img src="https://img.shields.io/badge/Awaitility-3498db?style=for-the-badge" alt="Awaitility">
</p>

<p align="center">
  Developed with ❤️ by <strong>Agnieszka Magura</strong><br>
  <a href="https://github.com/AgnieszkaMagura" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/agnieszka-magura-0714241a8/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
</p>
