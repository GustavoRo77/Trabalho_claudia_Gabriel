<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <section class="hero">
        <p class="eyebrow">EXPLORE SEM LIMITES</p>
        <h1>Guia de <span>Aventura</span></h1>
        <p>Descubra Joinville, Santa Catarina.</p>
      </section>

      <section class="map-area">
        <div ref="mapElement" class="map"></div>
        <div v-if="mapError" class="map-error"><ion-icon :icon="warningOutline" /> Não foi possível carregar o mapa. Verifique sua conexão.</div>
        <span class="map-status">{{ locationStatus }}</span>
        <ion-button class="locate" shape="round" @click="requestLocation(true)"><ion-icon :icon="locateOutline" /></ion-button>
      </section>

      <div class="actions">
        <ion-button :class="{ selected: nearOnly }" fill="clear" @click="toggleNear"><ion-icon :icon="locateOutline" /><small>{{ nearOnly ? 'Em 5 km' : 'Perto de mim' }}</small></ion-button>
        <ion-button fill="clear" @click="compassOpen = true; startCompass()"><ion-icon :icon="compassOutline" /><small>Bússola</small></ion-button>
        <ion-button fill="clear" @click="requestLocation(false)"><ion-icon :icon="locationOutline" /><small>Localização</small></ion-button>
      </div>

      <div class="coordinates">
        <div><span>LATITUDE</span><b>{{ current.lat.toFixed(6) }}</b></div>
        <div><span>LONGITUDE</span><b>{{ current.lng.toFixed(6) }}</b></div>
        <div><span>PRECISÃO</span><b>{{ current.accuracy ? `± ${Math.round(current.accuracy)} m` : '-- m' }}</b></div>
      </div>
      <div class="location-record">
        <div><b>Registro de localização</b><span>{{ lastRecord || 'Nenhuma posição registrada ainda' }}</span></div>
        <ion-button size="small" @click="saveLocation">Registrar</ion-button>
      </div>

      <section class="places">
        <div class="title-row"><div><p class="eyebrow">DESCUBRA</p><h2>Lugares para explorar</h2></div><ion-button fill="clear" size="small" @click="nearOnly = false">Ver todos</ion-button></div>
        <p v-if="visibleAttractions.length === 0" class="empty">Nenhum ponto em um raio de 5 km.</p>
        <div class="cards">
          <button v-for="place in visibleAttractions" :key="place.name" class="place-card" @click="selectPlace(place)">
            <img :src="place.image" :alt="place.name" /><div><h3>{{ place.name }}</h3><p>{{ distanceText(place) }}</p></div>
          </button>
        </div>
      </section>
    </ion-content>

    <ion-modal :is-open="!!selected" @did-dismiss="selected = null" :initial-breakpoint="0.68" :breakpoints="[0, 0.68, 0.92]">
      <ion-content v-if="selected"><img class="detail-image" :src="selected.image" :alt="selected.name" /><div class="detail"><p class="eyebrow">{{ selected.type }}</p><h2>{{ selected.name }}</h2><p>{{ selected.description }}</p><strong><ion-icon :icon="locateOutline" /> {{ distanceText(selected) }}</strong><ion-button expand="block" @click="openRoute"><ion-icon slot="end" :icon="navigateOutline" />Como chegar</ion-button></div></ion-content>
    </ion-modal>

    <ion-modal :is-open="compassOpen" @did-dismiss="compassOpen = false" class="compass-modal">
      <ion-content><div class="compass-content"><ion-button class="close" fill="clear" @click="compassOpen = false"><ion-icon :icon="closeOutline" /></ion-button><p class="eyebrow">DIREÇÃO ATUAL</p><div class="compass"><b class="north">N</b><b class="east">L</b><b class="south">S</b><b class="west">O</b><i :style="{ transform: `rotate(${heading}deg)` }"></i><em></em></div><h2>{{ heading }}°</h2><p>{{ headingName }}</p></div></ion-content>
    </ion-modal>
    <ion-toast :is-open="!!feedback" :message="feedback" :duration="2800" position="top" @did-dismiss="feedback = ''" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import { IonButton, IonContent, IonIcon, IonModal, IonPage, IonToast, onIonViewDidEnter } from '@ionic/vue';
import { closeOutline, compassOutline, locateOutline, locationOutline, navigateOutline, warningOutline } from 'ionicons/icons';
import { attractions } from '../data/attractions';
import type { Attraction, Coordinates } from '../models/attraction';

const initial: Coordinates = { lat: -26.30546, lng: -48.853 };
const current = ref<Coordinates>({ ...initial });
const mapElement = ref<HTMLElement>();
const locationStatus = ref('Referência: Senac Joinville');
const nearOnly = ref(false);
const selected = ref<Attraction | null>(null);
const compassOpen = ref(false);
const heading = ref(0);
const headingName = ref('Movimente o aparelho para calibrar');
const feedback = ref('');
const lastRecord = ref(localStorage.getItem('guia-aventura-ultimo-registro') ?? '');
const mapError = ref(false);
let map: L.Map | undefined;
let userMarker: L.Marker | undefined;
let locationWatch: string | undefined;
let markers: L.Marker[] = [];

const visibleAttractions = computed(() => nearOnly.value ? attractions.filter(place => kilometers(current.value, place) <= 5) : attractions);
const kilometers = (from: Coordinates, to: Coordinates) => {
  const rad = Math.PI / 180;
  const a = Math.sin((to.lat - from.lat) * rad / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin((to.lng - from.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const distanceText = (place: Attraction) => { const km = kilometers(current.value, place); return km < 1 ? `${Math.round(km * 1000)} m de você` : `${km.toFixed(1).replace('.', ',')} km de você`; };

function setupMap() {
  if (!mapElement.value || map) return;
  map = L.map(mapElement.value, { zoomControl: false }).setView([initial.lat, initial.lng], 13);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
  tiles.on('tileerror', () => { mapError.value = true; });
  tiles.addTo(map);
  const senacIcon = L.divIcon({ className: '', html: '<div class="senac-marker">S</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
  L.marker([initial.lat, initial.lng], { icon: senacIcon, zIndexOffset: 900 }).addTo(map).bindPopup('<b>Senac Joinville</b><br>Rua Visconde de Taunay, 730');
  const attractionIcon = L.divIcon({ className: '', html: '<div class="map-marker"><span>★</span></div>', iconSize: [31, 31], iconAnchor: [15, 31] });
  markers = attractions.map(place => L.marker([place.lat, place.lng], { icon: attractionIcon }).addTo(map!).on('click', () => selectPlace(place)));
}
function refreshMap() { markers.forEach((marker, index) => marker.setOpacity(!nearOnly.value || kilometers(current.value, attractions[index]) <= 5 ? 1 : 0.25)); }
function updateLocation(position: { coords: { latitude: number; longitude: number; accuracy: number } }) {
  current.value = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
  locationStatus.value = 'Sua localização em tempo real';
  const icon = L.divIcon({ className: '', html: '<div class="user-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  if (map) userMarker ? userMarker.setLatLng([current.value.lat, current.value.lng]) : userMarker = L.marker([current.value.lat, current.value.lng], { icon, zIndexOffset: 1000 }).addTo(map);
  refreshMap();
}
async function requestLocation(center: boolean) {
  try {
    locationStatus.value = 'Solicitando permissão…';
    await Geolocation.requestPermissions();
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    updateLocation(position);
    if (center) map?.setView([current.value.lat, current.value.lng], 15);
    if (!locationWatch) locationWatch = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 5000 }, (position) => { if (position) updateLocation(position); });
  } catch { locationStatus.value = 'Permissão não concedida'; feedback.value = 'Autorize a localização para usar este recurso.'; }
}
function toggleNear() { nearOnly.value = !nearOnly.value; refreshMap(); }
function selectPlace(place: Attraction) { selected.value = place; map?.panTo([place.lat, place.lng]); }
function openRoute() { if (selected.value) window.open(`https://www.google.com/maps/dir/?api=1&origin=${current.value.lat},${current.value.lng}&destination=${selected.value.lat},${selected.value.lng}&travelmode=walking`, '_blank'); }
function saveLocation() {
  if (!current.value.accuracy) { feedback.value = 'Ative a localização antes de registrar a posição.'; return; }
  const date = new Date();
  lastRecord.value = `Registrado em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  localStorage.setItem('guia-aventura-ultimo-registro', lastRecord.value);
  localStorage.setItem('guia-aventura-coordenadas', JSON.stringify(current.value));
  feedback.value = 'Localização registrada no dispositivo!';
}
async function startCompass() {
  type OrientationWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
  const orientation = DeviceOrientationEvent as OrientationWithPermission;
  if (orientation.requestPermission && await orientation.requestPermission() !== 'granted') { feedback.value = 'Permissão do sensor não concedida.'; return; }
  window.addEventListener('deviceorientationabsolute', onOrientation, true);
  window.addEventListener('deviceorientation', onOrientation, true);
}
function onOrientation(event: DeviceOrientationEvent) { const raw = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? (event.alpha === null ? undefined : 360 - event.alpha); if (raw === undefined) return; heading.value = Math.round(raw); headingName.value = ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'][Math.round(heading.value / 45) % 8]; }
onIonViewDidEnter(() => {
  // O Ionic termina a animação e o cálculo do layout neste ponto; só então o Leaflet mede o mapa.
  window.setTimeout(() => { setupMap(); map?.invalidateSize(); }, 100);
  window.setTimeout(() => map?.invalidateSize(), 450);
});
onBeforeUnmount(() => { if (locationWatch) Geolocation.clearWatch({ id: locationWatch }); window.removeEventListener('deviceorientation', onOrientation, true); window.removeEventListener('deviceorientationabsolute', onOrientation, true); map?.remove(); });
</script>

<style scoped>
ion-content{--background:#f7faf7}.hero{position:relative;overflow:hidden;background:linear-gradient(130deg,#063632,#17675f);color:#fff;padding:calc(28px + env(safe-area-inset-top)) 22px 42px}.hero::after{content:'';position:absolute;width:180px;height:180px;right:-68px;top:-92px;border:1px solid #d9ff5a4a;border-radius:50%;box-shadow:0 0 0 28px #d9ff5a0f,0 0 0 56px #d9ff5a0a}.hero h1,.hero>p,.hero .eyebrow{position:relative;z-index:1}.hero h1{font-size:35px;letter-spacing:-.8px;line-height:1;margin:0 0 11px}.hero h1 span,.hero .eyebrow{color:#d9ff5a}.hero>p:last-child{margin:0;font-size:14px;color:#d3e1dc}.eyebrow{letter-spacing:1.7px;font-weight:700;font-size:10px;margin:0 0 7px;color:#7f9d91}
.map-area{height:285px;position:relative;background:#dbe7df;overflow:hidden}.map{height:100%;width:100%;z-index:1}.map-error{position:absolute;inset:0;z-index:700;display:flex;align-items:center;justify-content:center;gap:8px;padding:25px;text-align:center;background:#0b3d3ae8;color:#fff;font-size:13px}.map-status{position:absolute;top:15px;left:15px;z-index:500;max-width:calc(100% - 86px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#062d2be8;color:#fff;padding:8px 11px;border-radius:20px;font-size:11px;box-shadow:0 3px 10px #062d2b3d}.locate{position:absolute;right:13px;bottom:13px;z-index:500;--background:#d9ff5a;--color:#063a35;--box-shadow:0 4px 12px #314b464f}
.actions{display:flex;gap:10px;margin:-26px 17px 0;position:relative;z-index:600}.actions ion-button{height:66px;flex:1;margin:0;--background:#fff;--color:#0b3d3a;--border-radius:13px;--box-shadow:0 5px 13px #17302a1c;transition:transform .18s ease}.actions ion-button:active,.place-card:active{transform:scale(.97)}.actions ion-button.selected{--background:#d9ff5a}.actions ion-icon{font-size:21px}.actions small{display:block;font-size:10px;font-weight:bold}.coordinates{display:flex;margin:21px 17px;padding:14px 6px;border-top:1px solid #dce3dd;border-bottom:1px solid #dce3dd}.coordinates div{flex:1;text-align:center;border-right:1px solid #dce3dd}.coordinates div:last-child{border:0}.coordinates span{display:block;font-size:8px;letter-spacing:1px;color:#70817d;font-weight:bold;margin-bottom:5px}.coordinates b{font-size:11px;color:#173d38}
.location-record{margin:0 17px 20px;padding:11px 12px;border:1px solid #d4e6dc;border-radius:12px;background:#eaf4ed;display:flex;align-items:center;justify-content:space-between;color:#155c52}.location-record b{font-size:12px;display:block}.location-record span{display:block;font-size:10px;color:#617872;margin-top:3px}.location-record ion-button{margin:0;--color:#fff;--background:#0b3d3a;--border-radius:8px}
.places{padding:4px 17px 26px}.title-row{display:flex;align-items:end;justify-content:space-between}.title-row h2{font-size:21px;letter-spacing:-.35px;margin:0 0 14px}.title-row ion-button{font-size:12px;--color:#267365}.cards{display:flex;overflow-x:auto;gap:13px;padding:2px 1px 17px;scroll-snap-type:x proximity}.place-card{min-width:185px;scroll-snap-align:start;background:#fff;border:0;text-align:left;border-radius:14px;overflow:hidden;padding:0;box-shadow:0 3px 12px #17302a14;transition:transform .18s ease,box-shadow .18s ease}.place-card:focus-visible{outline:3px solid #9cc93f;outline-offset:2px}.place-card img{height:105px;width:100%;object-fit:cover}.place-card div{padding:10px}.place-card h3{font-size:14px;margin:0 0 5px;color:#143331}.place-card p,.empty{font-size:11px;color:#70817d;margin:0}.empty{padding:14px 0}
.detail-image{height:190px;width:100%;object-fit:cover}.detail{padding:20px 22px}.detail h2{font-size:26px;margin:0 0 8px}.detail>p:not(.eyebrow){font-size:15px;line-height:1.45;color:#526964}.detail strong{display:flex;gap:5px;align-items:center;color:#155c52;margin:18px 0}.detail ion-button{--border-radius:11px;height:50px}.compass-content{text-align:center;padding:45px 25px}.close{position:absolute;right:8px;top:10px;--color:#0b3d3a}.compass{height:230px;width:230px;margin:24px auto 14px;border:8px solid #dce9df;border-radius:50%;position:relative;background:radial-gradient(circle,#fff 0 30%,#eff5ef 31%)}.compass b{position:absolute;color:#0b3d3a;font-size:18px}.north{top:10px;left:calc(50% - 7px);color:#d34838!important}.south{bottom:10px;left:calc(50% - 6px)}.east{right:12px;top:calc(50% - 10px)}.west{left:12px;top:calc(50% - 10px)}.compass i{position:absolute;top:34px;left:calc(50% - 5px);width:10px;height:82px;background:linear-gradient(to bottom,#e2473c 50%,#0b3d3a 50%);clip-path:polygon(50% 0,100% 100%,50% 84%,0 100%);transform-origin:50% 96%;transition:transform .15s}.compass em{position:absolute;width:16px;height:16px;left:calc(50% - 8px);top:calc(50% - 8px);border-radius:50%;background:#0b3d3a}.compass-content h2{font-size:30px;margin:0 0 4px}.compass-content>p:last-child{margin:0;color:#70817d;font-size:13px}
</style>
