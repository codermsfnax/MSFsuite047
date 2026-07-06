import * as THREE from 'three';
import { initAuth } from './auth-ui.js';
import { initSearch } from './search.js';
import { initNotifications } from './notifications.js';

document.addEventListener('DOMContentLoaded', () => {

  initAuth();
  initSearch();
  initNotifications();

  const intro = document.getElementById('introOverlay');
  if (intro) {
    if (!sessionStorage.getItem('msf-intro-shown')) {
      sessionStorage.setItem('msf-intro-shown', 'true');
      setTimeout(() => { intro.classList.add('hidden'); }, 2200);
    } else {
      intro.remove();
    }
  }

  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  revealElements.forEach(el => observer.observe(el));
  window.addEventListener('load', () => {
    revealElements.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight - 30) el.classList.add('visible'); });
  });

  const tocLinks = document.querySelectorAll('.toc a');
  const headings = document.querySelectorAll('h2[id]');
  if (tocLinks.length && headings.length) {
    const headingObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(link => { link.classList.remove('active'); if (link.getAttribute('href') === '#' + entry.target.id) link.classList.add('active'); });
        }
      });
    }, { rootMargin: '-60px 0px -60% 0px' });
    headings.forEach(h => headingObserver.observe(h));
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href'); if (href === '#') return;
      const target = document.querySelector(href); if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  const backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => { backToTopBtn.classList.toggle('visible', window.scrollY > 400); });
    backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  const discordBtn = document.getElementById('discordBtn');
  const discordModal = document.getElementById('discordModal');
  const modalClose = document.getElementById('modalClose');
  if (discordBtn && discordModal) {
    discordBtn.addEventListener('click', () => { discordModal.classList.add('active'); });
    discordModal.addEventListener('click', (e) => { if (e.target === discordModal) discordModal.classList.remove('active'); });
    if (modalClose) { modalClose.addEventListener('click', () => { discordModal.classList.remove('active'); }); }
  }

  const style = document.createElement('style');
  style.textContent = `::selection{background:rgba(155,89,182,0.3);color:#fff}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0a0c}::-webkit-scrollbar-thumb{background:#1e1e28;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#9B59B6}`;
  document.head.appendChild(style);

  console.log('%c MSF-043 %c Internal Dossier %c tg @user01_Unknown','color:#fff;background:#9B59B6;padding:4px 8px;font-weight:bold;','color:#888;background:#0a0a0c;padding:4px 8px;','color:#555;font-size:10px;');

  const bgCanvas = document.getElementById('bgParticles');
  if (bgCanvas) {
    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.PerspectiveCamera(60, bgCanvas.clientWidth / bgCanvas.clientHeight, 0.1, 50); bgCamera.position.z = 10;
    const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
    bgRenderer.setSize(bgCanvas.clientWidth, bgCanvas.clientHeight); bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); bgRenderer.setClearColor(0x000000, 0);
    const spriteTex = createGlowTexture();
    const pCount = 120; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(pCount * 3); const pVel = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) { pPos[i] = (Math.random() - 0.5) * 30; pPos[i + 1] = (Math.random() - 0.5) * 20; pPos[i + 2] = (Math.random() - 0.5) * 15; pVel[i] = (Math.random() - 0.5) * 0.003; pVel[i + 1] = (Math.random() - 0.5) * 0.003; pVel[i + 2] = (Math.random() - 0.5) * 0.003; }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.25, map: spriteTex, color: 0x9B59B6, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const pPoints = new THREE.Points(pGeo, pMat); bgScene.add(pPoints);
    function animateBg() { requestAnimationFrame(animateBg); const pos = pPoints.geometry.attributes.position.array; for (let i = 0; i < pCount * 3; i += 3) { pos[i] += pVel[i]; pos[i + 1] += pVel[i + 1]; pos[i + 2] += pVel[i + 2]; if (Math.abs(pos[i]) > 15) pVel[i] *= -1; if (Math.abs(pos[i + 1]) > 10) pVel[i + 1] *= -1; if (Math.abs(pos[i + 2]) > 7.5) pVel[i + 2] *= -1; } pPoints.geometry.attributes.position.needsUpdate = true; bgRenderer.render(bgScene, bgCamera); }
    animateBg();
    window.addEventListener('resize', () => { bgCamera.aspect = bgCanvas.clientWidth / bgCanvas.clientHeight; bgCamera.updateProjectionMatrix(); bgRenderer.setSize(bgCanvas.clientWidth, bgCanvas.clientHeight); });
  }

  const container = document.getElementById('canvas3d');
  if (container && typeof THREE !== 'undefined') {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 50); camera.position.set(4, 0, 7); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setSize(container.clientWidth, container.clientHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0); container.appendChild(renderer.domElement);
    const mainGroup = new THREE.Group(); mainGroup.position.set(3, 0, 0);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x9B59B6, roughness: 0.2, metalness: 0.9, emissive: 0x9B59B6, emissiveIntensity: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.02, 32, 100), ringMaterial); mainGroup.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.01, 16, 80), ringMaterial.clone()); ring2.material.emissiveIntensity = 0.3; ring2.rotation.x = Math.PI / 3; ring2.rotation.y = Math.PI / 4; mainGroup.add(ring2);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.015, 16, 70), ringMaterial.clone()); ring3.material.emissiveIntensity = 0.4; ring3.rotation.x = -Math.PI / 4; ring3.rotation.y = -Math.PI / 3; mainGroup.add(ring3);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(3, 0.015, 0.015), new THREE.MeshStandardMaterial({ color: 0x9B59B6, emissive: 0x9B59B6, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.8 })); mainGroup.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.015, 3, 0.015), new THREE.MeshStandardMaterial({ color: 0x9B59B6, emissive: 0x9B59B6, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.8 })); mainGroup.add(crossV);
    const centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: 0x9B59B6, roughness: 0.1, metalness: 0.5, emissive: 0x9B59B6, emissiveIntensity: 1.2 })); mainGroup.add(centerDot);
    scene.add(mainGroup);
    scene.add(new THREE.AmbientLight(0x9B59B6, 0.3)); const l1 = new THREE.DirectionalLight(0x9B59B6, 0.8); l1.position.set(5, 3, 5); scene.add(l1); const l2 = new THREE.DirectionalLight(0x9B59B6, 0.4); l2.position.set(-3, -2, -4); scene.add(l2);
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => { mouseX = (e.clientX / window.innerWidth) * 2 - 1; mouseY = -(e.clientY / window.innerHeight) * 2 + 1; });
    function animate() { requestAnimationFrame(animate); mainGroup.rotation.z += 0.003; mainGroup.rotation.y += 0.002; ring.rotation.x += 0.001; ring2.rotation.z -= 0.0015; ring3.rotation.y -= 0.002; const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.3; centerDot.scale.setScalar(pulse); centerDot.material.emissiveIntensity = 0.8 + Math.sin(Date.now() * 0.005) * 0.6; camera.position.x += (mouseX * 1.2 + 4 - camera.position.x) * 0.02; camera.position.y += (mouseY * 0.8 - camera.position.y) * 0.02; camera.lookAt(0, 0, 0); renderer.render(scene, camera); }
    animate();
    window.addEventListener('resize', () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); });
  }

  function createGlowTexture() { const size = 64; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d'); const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2); gradient.addColorStop(0, 'rgba(155, 89, 182, 1)'); gradient.addColorStop(0.1, 'rgba(155, 89, 182, 0.9)'); gradient.addColorStop(0.3, 'rgba(155, 89, 182, 0.5)'); gradient.addColorStop(0.6, 'rgba(155, 89, 182, 0.1)'); gradient.addColorStop(1, 'rgba(155, 89, 182, 0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size); return new THREE.CanvasTexture(canvas); }
});