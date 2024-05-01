import './index.html';
import './index.scss';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

function importAll(r) {
  let images = {};
  r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); })
  return images;
}
const diamond = importAll(require.context('./img/diamond', false, /\.(png|jpe?g|svg|webp)$/));
const material = importAll(require.context('./img/material', false, /\.(png|jpe?g|svg|webp)$/));
const ring = importAll(require.context('./img/ring', false, /\.(png|jpe?g|svg|webp)$/));
const world = importAll(require.context('./img/world', false, /\.(png|jpe?g|svg|webp)$/));

const buttonDiamondMap = {
  diamond: diamond,
  material: material,
  ring: ring,
  world: world
}

var colorDiamond = {};
var colorMaterial = {};
const colorSpaceDiamond = ['0xffad5c', '0xca96e5', '0xe596c9', '0x7c9ef3', '0x5db18c', '0xe5b55d', '0xe44485', '0x5cf5f4', '0x969696', '0xb55cff'];
const colorSpaceMatertial = ['0xb08d57 ', '0xb78e2a', '0xc0c0c0', '0x3b3b3b', '0x72d4cc', '0xffffff'];
function Color() {
  let nameDiamond = Object.keys(diamond);
  let nameMaterial = Object.keys(material);

  nameDiamond.forEach((item, index) => {
    let itemName = item.split('.')[0];
    colorDiamond[itemName] = colorSpaceDiamond[index];
  })
  nameMaterial.forEach((item, index) => {
    let itemName = item.split('.')[0];
    colorMaterial[itemName] = colorSpaceMatertial[index];
  })
}
Color();

var scene, camera, renderer, stats, loader, ring_1, light, envMap, loaderTexture, composer;
const params = {
  envMap: 'HDR',
  roughness: 0.0,
  metalness: 1.0,
  exposure: 0.5,
  debug: false
};
var modelParts = [];
let cameraY = -0.8;
let ringPosX = 0.43;
let ringPosY = -0.47;
let ringPosZ = 0.73;
let ringPosX3 = 0.1;
let ringPosY3 = -0.3;
let ringPosZ3 = 0.4;
let cameraPosZ = 1;
let cameraPosZ2 = 1;
let ringPosY2 = -0.05;
var stopRotation = false;
var btnContainer, choice;
let model, order;
var swiper;
let activeSection = 0;
let speed = 1000;

const mobile = (navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)
);

if (mobile) {
  speed = 700;
}

init();
animate();

function init() {
  // scene
  var canvas = document.querySelector('.canvas');
  scene = new THREE.Scene();
  scene.rotation.z = 0.5;
  // scene.background = new THREE.Color(0xf2c1c2);

  // camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 0, cameraPosZ);
  camera.rotation.y = cameraY;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // light
  light = new THREE.SpotLight(0xffffff, 10);
  light.position.set(0, 40, 0);
  light.castShadow = true;
  light.shadow.bias = 0;
  // scene.add(light);

  // resize
  window.addEventListener('resize', onWindowResize, false);
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // postprocessing.composer.setSize(window.innerWidth, window.innerHeight);
  }

  // render
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  // enviroment
  // loadEnv('./env/back-1.hdr');
  // pmremGenerator = new THREE.PMREMGenerator(renderer);
  // pmremGenerator.compileEquirectangularShader();

  // THREE.DefaultLoadingManager.onLoad = function () {
  //   pmremGenerator.dispose();
  // };
  loaderTexture = new THREE.TextureLoader();
  loadEnv('./env/back-1.jpg');



  // stats
  stats = new Stats;
  stats.showPanel(0);
  // document.body.appendChild(stats.domElement);


  // Loading
  const manager = new THREE.LoadingManager();
  const loaderPercent = document.querySelector('.loader-percent');
  const loaderWindow = document.querySelector('.loader');
  const waitWindow = document.querySelector('.wait');
  order = 'first';
  let percent;
  manager.onStart = function ( url, itemsLoaded, itemsTotal ) { 
    if (order == 'first') {
      Load(false, loaderWindow);
      percent =  itemsLoaded / itemsTotal * 100;
    } else {
      Load(false, waitWindow);
    }
  };
  manager.onLoad = function ( ) {
    if (order == 'first') {
      Load(true, loaderWindow);
    } else {
      Load(true, waitWindow);
    }
  };
  manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    if (order == 'first') {
      if (itemsLoaded / itemsTotal * 100 >= percent) {
        loaderPercent.innerHTML = (itemsLoaded / itemsTotal * 100) + '%';
        percent =  itemsLoaded / itemsTotal * 100;
      }
    }
  };
  manager.onError = function ( url ) {
    console.log( 'There was an error loading ' + url );
  };


  // ring
  loader = new GLTFLoader(manager);
  loader.load('./ring-11/scene.gltf', async (gltf) => {
    ring_1 = gltf.scene.children[0];
    ring_1.scale.set(0.1, 0.1, 0.1);
    ring_1.rotation.z = 0;
    ring_1.rotation.x = 3;
    ring_1.rotation.y = 1.7;
    ring_1.position.set(ringPosX, ringPosY, ringPosZ);
    ring_1.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        modelParts.push(n);
        // const wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x404040, wireframe: true, transparent: true, opacity: 0.5 } );
            // n.material = wireframeMaterial;
      }
    });
    scene.add(ring_1);
  })
  model = 'ring-11';


  // controls
  // controls = new OrbitControls(camera, renderer.domElement);

  // postprocessing
  // composer = new EffectComposer(renderer);
  // var renderPass = new RenderPass(scene, camera);
  // composer.addPass(renderPass);

  // // Bokeh
  // var bokehPass = new BokehPass(scene, camera, {
  //   focus: 0.5,
  //   aperture: 0.01,
  //   maxblur: 0.1,
  //   width: window.innerWidth,
  //   height: window.innerHeight
  // });
  // bokehPass.renderToScreen = true;
  // composer.addPass(bokehPass);
  // renderer.autoClear = false;

  animate();
}

function animate() {
  stats.begin();
  TWEEN.update();
  render();
  stats.end();
  requestAnimationFrame(animate);
}

function render() {
  let renderTarget;
  renderTarget = envMap;

  const newEnvMap = renderTarget ? renderTarget.texture : null;
  modelParts.forEach(item => {
    item.material.roughness = params.roughness;
    item.material.metalness = params.metalness;
    item.material.envMap = newEnvMap;
    item.material.needsUpdate = true;
  })

  renderer.toneMappingExposure = params.exposure;
  renderer.render(scene, camera);
  // composer.render();

  // controls.update();
  if (ring_1) {
    if (!stopRotation) {
      if (ring_1.rotation.y >= Math.PI * 2) {
        ring_1.rotation.y = 0;
      } else {
        ring_1.rotation.y += 0.001;
      }
    }
  }
}

function loadModel(path) {
  order = 'second';
  scene.remove(ring_1);
  modelParts = [];
  loader.load(path, gltf => {
    ring_1 = gltf.scene.children[0];
    ring_1.scale.set(0.1, 0.1, 0.1);
    ring_1.rotation.set(Math.PI, 0, 0);
    ring_1.position.set(0, -0.05, 0.2);
    ring_1.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        modelParts.push(n);
      }
    });
    scene.add(ring_1);
  })
}

function loadEnv(path) {
  // back = new RGBELoader().load(path, function (texture) {
  //   envMap = pmremGenerator.fromEquirectangular(texture).texture;
  //   scene.background = envMap;
  //   scene.environment = envMap;
  //   texture.dispose();
  //   pmremGenerator.dispose();
  // })

  loaderTexture.load(path, function (texture) {
    const envMap = texture;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = envMap;
    scene.environment = envMap;
    texture.dispose();
  });
}

var moveHandler = function MoveTo(e) {
  var moveX = (e.clientX - window.innerWidth / 2) * -0.00007;
  var moveY = (e.clientY - window.innerHeight / 2) * -0.00003;
  camera.rotation.x = -moveY;
  camera.rotation.y = cameraY - moveX;
  scene.rotation.x = moveY;
  scene.rotation.y = moveX;
}
function Move(check) {
  if (check) {
    document.addEventListener('mousemove', moveHandler);
  } else {
    document.removeEventListener('mousemove', moveHandler);
  }
}
Move(true);

function Rotation(check) {
  if (check) {
    stopRotation = false;
  } else {
    stopRotation = true;
  }
}

function Slide2(check) {
  if (check) {
    if (ring_1) {
      new TWEEN.Tween(scene.rotation)
        .to({ z: 0 }, speed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
      new TWEEN.Tween(ring_1.position)
        .to({ x: 0, y: ringPosY2, z: 0.2 }, speed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
      new TWEEN.Tween(ring_1.rotation)
        .to({ x: Math.PI, y: 0, z: 0 }, speed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
      new TWEEN.Tween(camera.rotation)
        .to({ x: 0, y: 0, z: 0 }, speed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start()
      new TWEEN.Tween(camera.position)
        .to({ z: cameraPosZ }, speed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start()
    }
  } else {
    new TWEEN.Tween(scene.rotation)
      .to({ z: 0.5 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.position)
      .to({ x: ringPosX, y: ringPosY, z: ringPosZ }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.rotation)
      .to({ x: 3, y: 1.7, z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(camera.rotation)
      .to({ x: 0, y: cameraY, z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
    new TWEEN.Tween(camera.position)
      .to({ z: 1 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }
}

function Slide3(check) {
  if (check) {
    new TWEEN.Tween(camera.rotation)
      .to({ x: 0, y: 0, z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
    new TWEEN.Tween(scene.rotation)
      .to({ z: 0.5 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.position)
      .to({ x: ringPosX3, y: ringPosY3, z: ringPosZ3 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.rotation)
      .to({ x: 3.5, y: 0.7, z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(camera.position)
      .to({ z: cameraPosZ2 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  } else {
    new TWEEN.Tween(scene.rotation)
      .to({ z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.position)
      .to({ x: 0, y: ringPosY2, z: 0.2 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(ring_1.rotation)
      .to({ x: Math.PI, y: 0, z: 0 }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    new TWEEN.Tween(camera.position)
      .to({ z: cameraPosZ }, speed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }
}

function Choice() {
  const buttonMenu = document.querySelectorAll('.custom__btn');
  choice = document.querySelector('.custom__choice');
  const exit = document.querySelector('.custom__choice-exit');
  btnContainer = document.querySelector('.custom__choice-btns');
  buttonMenu.forEach(item => {
    item.addEventListener('click', () => {
      let active = document.querySelector('.custom__btn--active');
      if (active) {
        active.classList.remove('custom__btn--active');
      }
      item.classList.add('custom__btn--active');
      choice.classList.add('custom__choice--active')

      // content
      let name = buttonDiamondMap[item.id];

      let count = Object.keys(name).length;
      let type = Object.keys(name)[0].split(".")[1];

      btnContainer.innerHTML = '';

      for (let i = 0; i < count; i++) {
        let withoutType = Object.keys(name)[i].split('.')[0];

        btnContainer.insertAdjacentHTML("beforeend",
          `<button class="custom__choice-btn">
            <img src="${name[`${item.id}-${i}.${type}`]}" alt="diamond">
          </button>`
        );

        // event button
        btnContainer.children[i].addEventListener('click', () => {
          let activeChoice = document.querySelector('.custom__choice-btn--active');
          if (activeChoice) {
            activeChoice.classList.remove('custom__choice-btn--active');
          }
          btnContainer.children[i].classList.add('custom__choice-btn--active');

          if (item.id == 'diamond') {
            if (model == 'ring-11') {
              modelParts[0].material.color.setHex(colorDiamond[`diamond-${i}`]);
            }
            if (model == 'ring-12') {
              modelParts[31].material.color.setHex(colorDiamond[`diamond-${i}`]);
              modelParts[30].material.color.setHex(colorDiamond[`diamond-${i}`]);
              modelParts[29].material.color.setHex(colorDiamond[`diamond-${i}`]);
              modelParts[28].material.color.setHex(colorDiamond[`diamond-${i}`]);
              modelParts[27].material.color.setHex(colorDiamond[`diamond-${i}`]);
              modelParts[26].material.color.setHex(colorDiamond[`diamond-${i}`]);
            }
            if (model == 'ring-13') {
              modelParts[15].material.color.setHex(colorDiamond[`diamond-${i}`]);
            }
            if (model == 'ring-14') {
              modelParts[1].material.color.setHex(colorDiamond[`diamond-${i}`]);
            }
            if (model == 'ring-15') {
              modelParts[2].material.color.setHex(colorDiamond[`diamond-${i}`]);
            }
          }
          if (item.id == 'material') {
            if (model == 'ring-11') {
              modelParts[1].material.color.setHex(colorMaterial[`material-${i}`]);
            }
            if (model == 'ring-12') {
              modelParts[34].material.color.setHex(colorMaterial[`material-${i}`]);
            }
            if (model == 'ring-13') {
              modelParts[16].material.color.setHex(colorMaterial[`material-${i}`]);
            }
            if (model == 'ring-14') {
              modelParts[0].material.color.setHex(colorMaterial[`material-${i}`]);
            }
            if (model == 'ring-15') {
              modelParts[0].material.color.setHex(colorMaterial[`material-${i}`]);
            }
          }
          if (item.id == 'ring') {
            loadModel(`./ring-1${i + 1}/scene.gltf`);
            model = `ring-1${i + 1}`;
          }
          if (item.id == 'world') {
            loadEnv(`./env/back-${i + 1}.jpg`);
          }
        })
      }

      // first button
      if (item.classList.contains('button-diamond')) {
        rotateDiamond();
      }
      // second button
      if (item.classList.contains('button-material')) {
        rotateMaterial();
      }
      // third button
      if (item.classList.contains('custom__btn-ring')) {
        rotateRing();
      }
      // fourth button
      if (item.classList.contains('custom__btn-world')) {
        rotateWorld();
      }

    })
  })
  exit.addEventListener('click', () => {
    choice.classList.remove('custom__choice--active');
    let active = document.querySelector('.custom__btn--active');
    if (active) {
      active.classList.remove('custom__btn--active');
    }
  })
  document.addEventListener('click', (e) => {
    if (!choice.contains(e.target) && !buttonMenu[0].contains(e.target) && !buttonMenu[1].contains(e.target) && !buttonMenu[2].contains(e.target) && !buttonMenu[3].contains(e.target)) {
      choice.classList.remove('custom__choice--active');
      let active = document.querySelector('.custom__btn--active');
      if (active) {
        active.classList.remove('custom__btn--active');
      }
    }
  })
}
Choice();

function rotateDiamond() {
  Rotation(true);
  new TWEEN.Tween(scene.rotation)
    .to({ z: 0.5 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.position)
    .to({ x: 0, y: -0.2, z: 0.5 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.rotation)
    .to({ x: 3.5, y: 0.7, z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
}

function rotateMaterial() {
  Rotation(true);
  new TWEEN.Tween(scene.rotation)
    .to({ z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.position)
    .to({ x: 0, y: ringPosY2, z: 0.2 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.rotation)
    .to({ x: Math.PI, y: 0, z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
}

function rotateRing() {
  Rotation(false);
  new TWEEN.Tween(scene.rotation)
    .to({ z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.position)
    .to({ x: 0, y: ringPosY2, z: 0.2 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.rotation)
    .to({ x: Math.PI, y: 0, z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
}

function rotateWorld() {
  new TWEEN.Tween(scene.rotation)
    .to({ z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.position)
    .to({ x: 0, y: ringPosY2, z: 0.2 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
  new TWEEN.Tween(ring_1.rotation)
    .to({ x: Math.PI, y: 0, z: 0 }, speed)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
}

document.addEventListener('DOMContentLoaded', () => {
  swiper = new Swiper('.swiper', {
    direction: 'vertical',
    speed: speed,
    mousewheel: true,
    simulateTouch: false,
    threshold: 2,
    on: {
      slideNextTransitionStart: () => {
        activeSection = swiper.activeIndex;
        if (swiper.activeIndex == 1) {
          Move(false);
          Rotation(false);
          Slide2(true);
          SlidesMenu('menu-custom');
        };
        if (swiper.activeIndex == 2) {
          Move(false);
          Slide3(true);
          Rotation(true);
          // close / clear
          choice.classList.remove('custom__choice--active');
          btnContainer.innerHTML = '';
          let active = document.querySelector('.custom__btn--active');
          if (active) {
            active.classList.remove('custom__btn--active');
          }
          SlidesMenu('menu-feedback');
        }
      },
      slidePrevTransitionStart: () => {
        activeSection = swiper.activeIndex;
        if (swiper.activeIndex == 0) {
          Move(true);
          Rotation(true);
          Slide2(false);
          // close / clear
          choice.classList.remove('custom__choice--active');
          btnContainer.innerHTML = '';
          let active = document.querySelector('.custom__btn--active');
          if (active) {
            active.classList.remove('custom__btn--active');
          }
          SlidesMenu('menu-home');
        };
        if (swiper.activeIndex == 1) {
          Slide3(false);
          Rotation(false);
          SlidesMenu('menu-custom');
        }
      }
    }
  })
})

function Menu() {
  const item = document.querySelectorAll('.menu__list-item');
  const button = document.querySelector('.burger');
  const menu = document.querySelector('.menu');
  item.forEach((item, index) => {
    item.addEventListener('click', () => {
      let active = document.querySelector('.menu__list-item--active');
      active.classList.remove('menu__list-item--active');
      item.classList.add('menu__list-item--active');

      swiper.slideTo(index);

      button.classList.remove('burger--active');
      menu.classList.remove('menu--active');
    })
  })
}
Menu();

function ArrowDown() {
  const arrow = document.querySelector('.top__link');
  arrow.addEventListener('click', (e) => {
    e.preventDefault();
    swiper.slideTo(1);

    SlidesMenu('menu-custom');
  })
}
ArrowDown();

function SlidesMenu(slide) {
  let active = document.querySelector('.menu__list-item--active');
  active.classList.remove('menu__list-item--active');
  let toSlide = document.getElementById(slide);
  toSlide.classList.add('menu__list-item--active');
}

function Burger() {
  const button = document.querySelector('.burger');
  const menu = document.querySelector('.menu');
  button.addEventListener('click', (e) => {
    e.preventDefault();
    button.classList.toggle('burger--active');
    menu.classList.toggle('menu--active');
  })
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !button.contains(e.target)) {
      button.classList.remove('burger--active');
      menu.classList.remove('menu--active');
    }
  })
}
Burger();

function Resize() {
  let windowWidth = window.screen.width;
  if (windowWidth >= 1200) {
    cameraPosZ2 = 1;
    if (camera && activeSection == 2) {
      camera.position.z = cameraPosZ2;
    }
  }
  if (windowWidth < 1200) {
    cameraPosZ2 = 1.3;
    if (camera && activeSection == 2) {
      camera.position.z = cameraPosZ2;
    }
  }
  if (windowWidth >= 1000) {
    let ringPosX = 0.43;
    let ringPosY = -0.47;
    let ringPosZ = 0.73;
    if (ring_1 && activeSection == 0) {
      ring_1.position.set(ringPosX, ringPosY, ringPosZ);
    }
  }
  if (windowWidth < 1000) {
    ringPosX = 0.45;
    ringPosY = -0.55;
    ringPosZ = 0.65;
    if (ring_1 && activeSection == 0) {
      ring_1.position.set(ringPosX, ringPosY, ringPosZ);
    }
  }
  if (windowWidth >= 900) {
    ringPosX3 = 0.1;
    ringPosY3 = -0.3;
    ringPosZ3 = 0.4;
    if (ring_1 && activeSection == 2) {
      ring_1.position.set(ringPosX3, ringPosY3, ringPosZ3);
    }
  }
  if (windowWidth < 900) {
    ringPosX3 = -0.07;
    ringPosY3 = -0.3;
    ringPosZ3 = 0.4;
    if (ring_1 && activeSection == 2) {
      ring_1.position.set(ringPosX3, ringPosY3, ringPosZ3);
    }
  }
  if (windowWidth < 800) {
    ringPosX = 0.5;
    ringPosY = -0.6;
    ringPosZ = 0.5;
    if (ring_1 && activeSection == 0) {
      ring_1.position.set(ringPosX, ringPosY, ringPosZ);
    }
  }
  if (windowWidth >= 700) {
    cameraPosZ = 1;
    ringPosY2 = -0.05;
    if (ring_1 && activeSection == 1) {
      ring_1.position.y = ringPosY2;
    }
    if (camera && activeSection == 1) {
      camera.position.z = cameraPosZ;
    }
  }
  if (windowWidth < 700) {
    // camera.position.z = 1.5;
    cameraPosZ = 1.5;
    ringPosY2 = -0.1;
    if (ring_1 && activeSection == 1) {
      ring_1.position.y = ringPosY2;
    }
    if (camera && activeSection == 1) {
      camera.position.z = cameraPosZ;
    }
  }
  if (windowWidth < 600) {
    ringPosX = 0.6;
    ringPosY = -0.7;
    ringPosZ = 0.3;
    if (ring_1 && activeSection == 0) {
      ring_1.position.set(ringPosX, ringPosY, ringPosZ);
    }
  }
  if (windowWidth < 500) {
    ringPosX3 = -0.09;
    ringPosY3 = -0.37;
    ringPosZ3 = 0.3;
    if (ring_1 && activeSection == 2) {
      ring_1.position.set(ringPosX3, ringPosY3, ringPosZ3);
    }
  }
}
Resize();

function WindowHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  window.addEventListener('resize', () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Resize
    Resize();
  })
}
WindowHeight();

function Load(check, loader) {
  if ( check ) {
    loader.classList.add('hidden');
  } else {
    loader.classList.remove('hidden');
  }
}



// document.addEventListener('DOMContentLoaded', () => {
//   full = new fullpage('#fullpage', {
//     anchors: ['firstPage', 'secondPage', 'thirdPage'],
//     onLeave: function (origin, destination, direction, trigger) {
//       var origin = this;
//       if (origin.index == 0 && direction == 'down' && destination.index == 1) {
//         Move(false);
//         Rotation(false);
//         Slide2(true);
//       }
//       if (origin.index == 0 && direction == 'down' && destination.index == 2) {
//         Move(false);
//         Slide13(true);
//       }
//       if (origin.index == 1 && direction == 'up') {
//         Move(true);
//         Rotation(true);
//         Slide2(false);
//         // close / clear
//         choice.classList.remove('custom__choice--active');
//         btnContainer.innerHTML = '';
//         let active = document.querySelector('.custom__btn--active');
//         if (active) {
//           active.classList.remove('custom__btn--active');
//         }
//       }
//       if (origin.index == 1 && direction == 'down') {
//         Slide3(true);
//         Rotation(true);
//       }
//       if (origin.index == 2 && direction == 'up' && destination.index == 1) {
//         Slide3(false);
//         Rotation(false);
//       }
//       if (origin.index == 2 && direction == 'up' && destination.index == 0) {
//         Slide13(false);
//       }
//     }
//   })
//   })