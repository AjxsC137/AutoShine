# ◈ AutoShine: Premium Car Wash Detailing

<a href="https://auto-shine-4wikik2qh-ajits-projects-98f27314.vercel.app" target="_blank">
  <img src="https://img.shields.io/badge/LIVE%20DEMO-00c9a7?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
</a>

Welcome to **AutoShine**!  
A premium, high-performance web experience designed for a modern car detailing business. This site combines cutting-edge 3D graphics with a sleek, minimalist UI to reflect the quality and precision of the services offered.

---

### ✨ Features

* **🏎️ Interactive 3D Car Showcase**
    Experience a fully interactive 3D car model on every section. Users can drag to rotate the vehicle to see the "shine" from every angle.
* **🌓 Dynamic Theme Engine**
    Seamlessly switch between **Dark** and **Light** modes. The 3D scene environment, including fog colors and lighting, updates in real-time to match the UI.
* **📱 Precision-Engineered Responsive Design**
    A custom layout that adapts perfectly to mobile. On smaller screens, the 3D viewport adjusts its scale and camera position to maintain visual impact.
* **✨ Smart Interactive Cursor**
    A custom-built dual-ring cursor that reacts to hover states on buttons and links, providing a tactile feel to the browsing experience.
* **⚡ Spring-Back Physics**
    The 3D models use a physics-based spring system; when a user stops dragging the car, it smoothly settles back into its "hero" position.
* **🛠️ Service Spotlight**
    Categorized service cards with hover-reveal borders and smooth scroll-in animations.
* **📱 Instant Booking Integration**
    Direct "One-Tap" booking links for WhatsApp and Instagram, pre-filled with customer inquiries for higher conversion.

---

### 🛠️ Tech Stack

* **Core**: HTML5, CSS3 (Custom Variables & Modern Grid/Flexbox)
* **3D Engine**: Three.js (WebGL)
* **Models**: GLTF/GLB with ACES Filmic Tone Mapping
* **Animations**: Intersection Observer API & CSS Keyframes
* **Deployment**: Vercel

---

### 🚦 Setup & Customization

To run this project locally:

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/your-username/autoshine.git](https://github.com/your-username/autoshine.git)
   cd autoshine

   Asset Placement
Ensure your 3D car model is placed in the root directory as car.glb.

Local Server
Since the project uses ES Modules and 3D textures, it must be served via a local server:

Bash
# If you have Node/NPX
npx serve .
Tuning the 3D Views
You can adjust the car's starting angle for each section in main.js using the restAngleY parameter.

🌐 UI & Performance
Parchment Light Mode: The light theme uses a warm parchment hex (#f0ece4) rather than clinical white to maintain a premium feel.

Optimized Rendering: The site uses an IntersectionObserver to pause 3D rendering when a section is not visible, significantly reducing CPU/GPU usage.

Custom Typography: Integrated Google Fonts featuring Bebas Neue, DM Sans, and Space Mono.

🛡️ License
MIT

Made with ❤️ by Ajit
