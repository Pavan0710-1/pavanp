import {createRoadNetwork,planRoadRoute} from './pursuitNavigation.js';
import { createCharacterSequenceController } from './characterSequences.js';
import { createCampaignScenarios } from './campaignScenarios.js';
import { createCampaignPresentation } from './campaignPresentation.js';
import { placeCharacterInVehicle, applyCharacterAssetSuit } from './gltfChar.js';
import { createCampaignCast, campaignArc } from './campaignCast.js';
import { AUTHORED_WORLD_LOTS, createAuthoredWorld } from './authoredWorld.js';
import { worldAssets } from './worldAssets.js';
import { loadAsset } from './assetLoader.js';
import { initCampaign } from './campaign.js';
import { CAMPAIGN_LOCATIONS, campaignMission } from './campaignContent.js';
import { initVehicleAuctions } from './vehicleAuctions.js';
import { createRenderResolution, computeRenderSize } from './renderResolution.js';
import { componentEffects, applyVehicleDamage } from './vehicleComponents.js';
import * as THREE from 'three';
import { solidDistance, createWeaponModel, equipCharacter, poseWeapon, muzzlePosition } from './combat-view.js';
import { initInput, endFrame, pollGamepad, keys, pressed, mouse, captureMouse } from './input.js';
import { buildCity, resolveCircle, pointBlocked, groundHeight, blockStart, BLOCK, HALF, N } from './city.js';
import { createCharacter, animateWalk, animateIdle, animateLand, resetArticulation, updateCharacterDetail, updateCharacterAnimation, CHARACTERS } from './characters.js';
import { makeVehicle, physStep, separateCars, darkenCar, updateVehicleDetail } from './car.js';
import { updateVehicleAsset, vehicleControls, setVehiclePanel, vehicleControlHint, helicopterControls } from './gltfVehicle.js';
import { runtime } from './runtime.js';
import { describeVehicle } from './vehicleFuel.js';
import { spawnPeds, updatePeds, killPed, spawnTraffic, updateTraffic, disableTraffic, spawnParked } from './npc.js';
import { updatePolice, addCrime, copDie, clearCops } from './police.js';
import { makeHeli, physStepHeli, spinRotors, explodeHeli, updateFallingHeli, updatePoliceHelis } from './heli.js';
import { initEffects, addTracer, addExplosion, addFlash, addSmoke, addSparks, addSkid, updateEffects } from './effects.js';
import { initHUD, updateHUD, setHint, showBanner, hideBanner, showToast, showNews } from './hud.js';
import { createSkyDome, applyDayNight, DAY_START } from './daynight.js';
import { initMissions, updateMissions, failMission, mission } from './missions.js';
import { initWeather, updateWeather } from './weather.js';
import { buildLandmarks, updateLandmarks } from './landmarks.js';
import { initWeb, fireWeb, releaseWeb, swingStep, updateWebVisual, poseSwing, poseFall } from './web.js';
import { initShops, updateShops, ensureGarageVehicle, garageCheck, applyGarageMods } from './shops.js';
import { initOwnedVehicles, ownedVehicleSnapshot, findVehicleSpace } from './ownedVehicles.js';
import { initVehicleServices } from './vehicleServices.js';
import { initVehiclePanel } from './vehiclePanel.js';
import { tickNitro } from './nitroStation.js';
import { initTouch, isTouch, showTouchUI, showKioskButtons, showContextButtons, setTouchMode } from './touch.js';
import { initMenu, openMenu, closeMenu, openMap, closeMap, drawBigMap } from './menu.js';
import { vibrate, goFullscreen, keepAwake, grabCanvas, saveOrShare, openCamera, closeCamera, cameraSupported } from './device.js';
import { initStunts, updateStunts, placeTrampoline, tryBounce, checkRamp, bounceFx } from './stunts.js';
import { initGang, updateGang, killGangMember } from './gangs.js';
import { updateArmy, killTank } from './army.js';
import { initAmbient, updateAmbient } from './ambient.js';
import { initArena, updateArena, endArena } from './arena.js';
import { initEconomy, updateEconomy, addChaos, resetChaos, trackDaily, newDay } from './economy.js';
import { showInterstitial } from './ads.js';
import { initRaces, updateRaces, endRace } from './races.js';
import { initWater, updateWater, physStepBoat, inWater, WATER_Y } from './water.js';
import { initDog, updateDog } from './dog.js';
import { initHeist, updateHeist, failHeist } from './heist.js';
import { initVaultHeist, updateVaultHeist, vaultHeistSave, failVaultHeist } from './vaultheist.js';
import { initBombSquad, updateBombSquad, bombSquadSave } from './bombsquad.js';
import { initAirTaxi, updateAirTaxi, airTaxiSave } from './airtaxi.js';
import { initBusRoute, updateBusRoute, busRouteSave } from './busroute.js';
import { initTowTruck, updateTowTruck, towTruckSave } from './towtruck.js';
import { initGokart, updateGokart, gokartSave } from './gokart.js';
import { initLockpick, updateLockpick, lockpickSave } from './lockpick.js';
import { initKaraoke, updateKaraoke, karaokeSave } from './karaoke.js';
import { initMailRun, updateMailRun, mailRunSave } from './mailrun.js';
import { initTreasure, updateTreasure, treasureSave } from './treasure.js';
import { initLifeguard, updateLifeguard, lifeguardSave } from './lifeguard.js';
import { initCatRescue, updateCatRescue, catRescueSave } from './catrescue.js';
import { initWaterTaxi, updateWaterTaxi, waterTaxiSave } from './watertaxi.js';
import { initFireworks, updateFireworks, fireworksSave } from './fireworks.js';
import { initBillboard, updateBillboard, billboardSave } from './billboard.js';
import { initFoodTruck, updateFoodTruck, foodTruckSave } from './foodtruck.js';
import { initShellGame, updateShellGame, shellGameSave } from './shellgame.js';
import { initArmWrestle, updateArmWrestle, armWrestleSave } from './armwrestle.js';
import { initQuickDraw, updateQuickDraw, quickDrawSave } from './quickdraw.js';
import { initTrivia, updateTrivia, triviaSave } from './trivia.js';
import { initConnectFour, updateConnectFour, connectFourSave } from './connectfour.js';
import { initWhackAMole, updateWhackAMole, whackAMoleSave } from './whackamole.js';
import { initFountain, updateFountain, fountainSave } from './fountain.js';
import { initLivingStatue, updateLivingStatue, livingStatueSave } from './hedgemaze.js';
import { initHedgeMaze, updateHedgeMaze, hedgeMazeSave } from './hedgemaze.js';
import { initStargazing, updateStargazing, stargazingSave } from './stargazing.js';
import { initWindowWasher, updateWindowWasher, windowWasherSave } from './windowwasher.js';
import { initClimbWall, updateClimbWall, climbWallSave } from './climbwall.js';
import { initParkingWarden, updateParkingWarden, parkingWardenSave } from './parkingwarden.js';
import { initPickpocket, updatePickpocket, pickpocketSave } from './pickpocket.js';
import { initDrivingSchool, updateDrivingSchool, drivingSchoolSave } from './drivingschool.js';
import { initDragStrip, updateDragStrip, dragStripSave } from './dragstrip.js';
import { initHarborCrane, updateHarborCrane, harborCraneSave } from './harborcrane.js';
import { initCrabPots, updateCrabPots, crabPotsSave } from './crabpots.js';
import { initHorseBets, updateHorseBets, horseBetsSave } from './horsebets.js';
import { initRecycling, updateRecycling, recyclingSave } from './recycling.js';
import { initBarGames, updateBarGames, barGamesSave } from './bargames.js';
import { initBowling, updateBowling, bowlingSave } from './bowling.js';
import { initArchery, updateArchery, archerySave } from './archery.js';
import { initPinball, updatePinball, pinballSave } from './pinball.js';
import { initBungee, updateBungee, bungeeSave } from './bungee.js';
import { initCarnival, updateCarnival, carnivalSave } from './carnival.js';
import { initGarbage, updateGarbage, garbageSave } from './garbage.js';
import { initTurfWar, updateTurfWar } from './turfwar.js';
import { initBlackjack, openBlackjack } from './blackjack.js';
import { initVigilante, updateVigilante, endVigilante } from './vigilante.js';
import { initArmored, updateArmored } from './armored.js';
import { initSlots, openSlots } from './slots.js';
import { initRoulette, openRoulette } from './roulette.js';
import { initPropRaids, updatePropRaids } from './propraid.js';
import { initJetpack, updateJetpackPad, updateJetpack } from './jetpack.js';
import { initAmbulance, updateAmbulance } from './ambulance.js';
import { initExport, updateExport } from './export.js';
import { initBounty, updateBounty } from './bounty.js';
import { initBaseJump, updateBaseJump } from './basejump.js';
import { initHoops, updateHoops } from './hoops.js';
import { initUfo, updateUfo } from './ufo.js';
import { initLottery, updateLottery } from './lottery.js';
import { initFightClub, updateFightClub, endFightClub } from './fightclub.js';
import { initPoker, openPoker } from './poker.js';
import { initLegend, openLegend, updateLegend, forceCrown, initFable } from './legend.js';
import { initCheats, typingCheat } from './cheats.js';
import { initFinale, updateFinale, endFinale } from './finale.js';
import { initNemesis, updateNemesis, forceNemesis, endNemesisFight } from './nemesis.js';
import { initZombies, updateZombies, startOutbreak, endOutbreak } from './zombies.js';
import { initTrain, updateTrain, endTrainHeist } from './train.js';
import { initDisasters, updateDisasters, forceDisaster } from './disasters.js';
import { initPrison, updatePrison, prisonIntake } from './prison.js';
import { initMyths, updateMyths } from './myths.js';
import { initStranger, updateStranger } from './stranger.js';
import { initCasinoHeist, updateCasinoHeist, endCasinoHeist } from './casinoheist.js';
import { initDerby, updateDerby, tryStartDerby, abortDerby } from './derby.js';
import { initPlane, updatePlaneFlight, updatePlaneDock } from './plane.js';
import { initEmpire, updateEmpire, tryEmpireTakeover, endEmpireFights } from './empire.js';
import { initDiving, updateDivingShack, updateDive } from './diving.js';
import { initPaparazzi, updatePaparazzi } from './paparazzi.js';
import { initMayor, updateMayor } from './mayor.js';
import { initPrestige, updatePrestige } from './prestige.js';
import { initGauntlet, updateGauntlet, endGauntlet } from './gauntlet.js';
import { initSwingRaces, updateSwingRaces, endSwingRace } from './swingrace.js';
import { initFirefight, updateFirefight, forceFireEvent } from './firefight.js';
import { initMuseum, updateMuseum, endMuseum } from './museum.js';
import { initKaiju, updateKaiju, forceKaiju } from './kaiju.js';
import { initSyndicate, updateSyndicate, endSyndicate } from './syndicate.js';
import { initSkydive, updateSkydivePad, updateSkydive, bailFromPlane } from './skydive.js';
import { initTournament, updateTournament, abortTournament } from './tournament.js';
import { initCrew, updateCrew } from './crew.js';
import { initContracts, updateContracts, endContract } from './contracts.js';
import { initSubway, updateSubway } from './subway.js';
import { initBusking, updateBusking, abortBusking } from './busking.js';
import { initWorkbench, updateWorkbench } from './workbench.js';
import { initStormChaser, updateStormChaser } from './stormchaser.js';
import { initFerry, updateFerry } from './ferry.js';
import { initZipline, updateZipline } from './zipline.js';
import { initBalloon, updateBalloonPad, updateBalloon } from './balloon.js';
import { initDrone, updateDronePad, updateDrone } from './drone.js';
import { initTaxi, updateTaxi } from './taxi.js';
import { initValet, updateValet } from './valet.js';
import { initCarwash, updateCarwash } from './carwash.js';
import { initBarber, updateBarber } from './barber.js';
import { initTattoo, updateTattoo, tattooSave } from './tattoo.js';
import { initArmsdealer, updateArmsdealer } from './armsdealer.js';
import { initDruglab, updateDruglab, endDruglab } from './druglab.js';
import { initVendors, updateVendors } from './vendors.js';
import { initAtms, updateAtms } from './atm.js';
import { initBanking, updateBanking, bankingSave, awardMoney, bankingBusy } from './banking.js';
import { initPayphones, updatePayphones, endPhoneJob } from './payphone.js';
import { initPigeons, updatePigeons } from './pigeons.js';
import { initGraffiti, updateGraffiti } from './graffiti.js';
import { initHydrants, updateHydrants } from './hydrants.js';
import { initSpeedcams, updateSpeedcams } from './speedcams.js';
import { initGasStations, updateGasStations, burnFuel, hasFuel, canRefuel } from './gasstations.js';
import { initRoadblocks, updateRoadblocks } from './roadblocks.js';
import { initGarageMulti, updateGarageMulti, lockupStore, lockupSave } from './garage_multi.js';
import { initCarRadioWheel, updateCarRadioWheel, radioWheelBusy } from './carradio_wheel.js';
import { initStreetFood, updateStreetFood } from './streetfood.js';
import { initChopShop, updateChopShop } from './chopshop.js';
import { initImpound, updateImpound, impoundSeize } from './impound.js';
import { initWeatherHazards, updateWeatherHazards, roadGrip } from './weather_hazards.js';
import { initPassengers, updatePassengers, toggleForHire, rideHailCrash, rideHailSave } from './passengers.js';
import { initBlackout, updateBlackout, forceBlackout } from './blackout.js';
import { initDemolition, updateDemolition } from './demolition.js';
import { initBountyHunter, updateBountyHunter } from './bountyhunter.js';
import { initStreetRace, updateStreetRace } from './streetrace.js';
import { initSafehouses, updateSafehouses, nearestSafehouseDoor } from './safehouses.js';
import { initMeters, updateMeters } from './meters.js';
import { initEmotes, updateEmotes, poseEmote } from './emotes.js';
import { initVehicleFx, updateVehicleFx } from './vehiclefx.js';
import { initBodyguard, updateBodyguard } from './bodyguard.js';
import { initWildlife, updateWildlife } from './wildlife.js';
import { initGym, updateGym } from './gym.js';
import { initFortune, updateFortune } from './fortune.js';
import { initDice, updateDice } from './dice.js';
import { initHobo, updateHobo } from './hobo.js';
import { initWingsuit, updateWingsuit } from './wingsuit.js';
import { initWebpull, updateWebpull } from './webpull.js';
import { initTrainjack, updateTrainjack } from './trainjack.js';
import { initBoatrace, updateBoatrace, endBoatrace } from './boatrace.js';
import { initTrickpark, updateTrickpark } from './trickpark.js';
import { initElevators, updateElevators } from './elevators.js';
import { initPizza, updatePizza, endPizza } from './pizza.js';
import { initRepo, updateRepo } from './repo.js';
import { initIcetruck, updateIcetruck } from './icetruck.js';
import { initNewschopper, updateNewschopper, endNewsjob } from './newschopper.js';
import { initCopcareer, updateCopcareer, endShift } from './copcareer.js';
import { initStorerob, updateStorerob } from './storerob.js';
import { initJewelry, updateJewelry } from './jewelry.js';
import { initPinkslip, updatePinkslip, endPinkslip } from './pinkslip.js';
import { initMostwanted, updateMostwanted } from './mostwanted.js';
import { initBribe, updateBribe } from './bribe.js';
import { initLawyer, updateLawyer } from './lawyer.js';
import { initStocks, updateStocks } from './stocks.js';
import { initCasinoboss, updateCasinoboss, endCasinoRaid } from './casinoboss.js';
import { initCalendar, updateCalendar } from './calendar.js';
import { initMall, updateMall } from './mall.js';
import { initSewer, updateSewer } from './sewer.js';
import { initArcade, updateArcade } from './arcade.js';
import { initGolf, updateGolf } from './golf.js';
import { initPokertourney, updatePokertourney } from './pokertourney.js';
import { initChess, updateChess } from './chess.js';
import { initGhosts, updateGhosts } from './ghosts.js';
import { initBossrush, updateBossrush, endBossrush } from './bossrush.js';
import { initPerks, updatePerks } from './perks.js';
import { initExplorer, updateExplorer } from './explorer.js';
import { initArmor, updateArmor } from './armor.js';
import { initProperties, updateProperties, propertiesMidnight, propertiesSave } from './properties.js';
import { initFishing, updateFishing } from './fishing.js';
import { initNightclub, updateNightclub } from './nightclub.js';
import { initSkateboard, updateSkateboard } from './skateboard.js';
import { resolveTier, tierSpec, createEnvironment, createShadowRig, createPostChain, createEntityActivity } from './graphics.js';
import { bootActiveSlot, mirrorActiveSlot, buildSlotPicker, readActiveSave, commitActiveSave, suspendSaveWrites } from './saveslots.js';
import { initCloudSave, cloudSaveTick, scheduleCloudPush } from './cloudsave.js';
import { initReplay, recordReplay, updateReplay, openReplay, closeReplay, replayActive } from './replay.js';
import { initAccessibility, openAccessibility } from './accessibility.js';
import { initPerf, updatePerf } from './perf.js';
import { initScars, updateScars } from './scars.js';
import { initCityNews, updateCityNews } from './citynews.js';
import { initNpcMemory, updateNpcMemory } from './npcmemory.js';
import { initPhotoBounty, updatePhotoBounty, photoBountySave } from './photobounty.js';

// Point the game's single save key at the active slot before anything reads it.
await bootActiveSlot();
const loadingStage=async(label,completed)=>{window.dispatchEvent(new CustomEvent('open-city-loading',{detail:{label,completed}}));await new Promise(resolve=>requestAnimationFrame(resolve));};
await loadingStage('Save selected; preparing renderer',1);

// ---------- renderer / scene ----------

// Graphics tier is decided once from the saved settings + a device probe.
// `gfx` (the spec) gates every heavy feature from here on.
const gfxTier = resolveTier((() => {
  try { return runtime.settings(readActiveSave()); }
  catch { return {}; }
})());
let gfx = tierSpec(gfxTier);

const renderer = new THREE.WebGLRenderer({ antialias: gfxTier !== 'low', powerPreference: 'high-performance' });
// Count the whole post-processing frame, rather than only its final screen pass.
renderer.info.autoReset = false;
const initialRenderSize=computeRenderSize({width:window.innerWidth,height:window.innerHeight,dpr:window.devicePixelRatio||1,policy:runtime.profile.graphics,settings:runtime.settings(readActiveSave())});
renderer.setPixelRatio(1);
renderer.setSize(initialRenderSize.width,initialRenderSize.height,false);
renderer.shadowMap.enabled = gfxTier !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // film-grade color response
renderer.toneMappingExposure = 1.05;
renderer.domElement.id = 'game';
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9db8d2, 150, 520);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1900);

// Real outdoor environment map (procedural sky bake) drives reflections on car
// paint, glass and metal. Refreshed by the day/night code as the sun moves.
const env = createEnvironment(renderer, gfxTier);
scene.environment = env.texture;

const hemi = new THREE.HemisphereLight(0xd5e4f2, 0x4a463c, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.3);
scene.add(sun);
scene.add(sun.target);

// Wide, camera-facing sun shadow (see graphics.js). Owns the sun's position.
const shadowRig = createShadowRig(scene, camera, sun, gfxTier);

// Post-processing chain, built per tier: RenderPass + (GTAO high only) + bloom
// + SMAA + (colour-grade LUT high only). `bloom` is exposed so the day/night
// code can breathe its strength with the city lights.
const post = createPostChain(renderer, scene, camera, gfxTier, {
  ao: (() => {
    try { return !!readActiveSave().settings?.ao; }
    catch { return false; }
  })(),
});
const composer = post.composer;
const bloom = post.bloom;

let resolutionSettings=runtime.settings(readActiveSave());
const resolution=createRenderResolution({renderer,camera,post,policy:runtime.profile.graphics,settings:()=>resolutionSettings});
resolution.resize();
window.addEventListener('resize',()=>resolution.resize());

// ---------- world ----------

// Snapshot the scene before the city goes in, so we can freeze only what the
// city and landmarks add. Their meshes never move; recomputing their world
// matrices every frame was ~10% of frame time once the district kit landed.
const preCityChildren = new Set(scene.children);
await loadingStage('Renderer ready; building neighbourhood',2);
const city = buildCity(scene,{authoredLots:AUTHORED_WORLD_LOTS});
const landmarks = buildLandmarks(scene, city);
for (const child of scene.children) {
  if (preCityChildren.has(child)) continue;
  child.updateMatrixWorld(true);
  child.traverse((o) => {
    // instanced meshes and anything tagged dynamic keep updating
    if (o.userData?.dynamic || o.isInstancedMesh && o.userData?.animated) return;
    o.matrixAutoUpdate = false;
  });
}

const authoredWorld = createAuthoredWorld({scene,city,assets:worldAssets,loadAsset});
city.authoredWorld = authoredWorld;
const sky = createSkyDome(scene);
const weather = initWeather(scene);
initEffects(scene);

initHUD();
initInput();
initTouch(); // phones get a joystick + buttons
const web = initWeb(scene);

// web parachute canopy
const chuteMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xf2f2ec, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
);
chuteMesh.visible = false;
scene.add(chuteMesh);

// persistent progress
const SAVE_KEY = runtime.saveKeys.live;
let save = {};
save = readActiveSave();

// every new player starts with a $5,000 bank balance
const STARTING_CASH = 5000;
const isNewPlayer = save.money === undefined;

// chosen playable character (saved between sessions)
const charDef = CHARACTERS.find((c) => c.key === save.char) || CHARACTERS[0];
const playerChar = createCharacter({...charDef.colors,asset:'kai',animationManaged:true});
playerChar.group.userData.stableRoot = true;
scene.add(playerChar.group);

const player = {
  ch: playerChar,
  mesh: playerChar.group,
  pos: playerChar.group.position,
  vel: new THREE.Vector3(),
  heading: 0,
  health: charDef.health,
  charDef,
  inCar: null,
  inHeli: null,
  inBoat: null,
  inPlane: null,
  swim: false,
  animT: 0,
  vy: 0,
  onGround: true,
  glide: false, // floaty hang-time after releasing a swing
  wallT: 3,     // wall-run stamina (~22m of vertical sprint)
  dodgeT: 0,    // dodge-roll i-frames
  landT: 0,     // landing-crouch timer
};
player.pos.copy(city.spawn);

const world = {
  economyPolicy: runtime.profile.economy,
  camera,
  scene,
  city,
  player,
  // Tier caps include CPU simulation load as well as render quality.
  peds: spawnPeds(scene, city, gfx.pedCap, gfxTier === 'low' ? player.pos : null),
  traffic: spawnTraffic(scene, city, gfx.trafficCap),
  parked: spawnParked(scene, gfxTier === 'low' ? 22 : 34),
  cops: [],
  helis: [],
  policeHelis: [],
  pickups: [],
  wanted: 0,
  wantedTimer: 0,
  bustedT: 0,
  busted: false,
  roadWet: 0, // 0 dry .. 1 soaked; driven by weather, decays after rain

  money: isNewPlayer ? STARTING_CASH : (save.money || 0),
  damageFlash: 0,
  time: 0,
  lastShot: null,
  weaponName: 'PISTOL',
  shake: 0,
  clock: DAY_START, // in-game hour, 24 real minutes per day
  sunDir: new THREE.Vector3(0.5, 1, 0.4).normalize(),
  maxHealth: charDef.health,
  charKey: charDef.key,
  tanks: [],
  style: 0, // swing style points, cashed out on landing
  radioSt: save.radio | 0,
  targets: [], // unified shootable extras: SWAT, drones, hunters, rooftop marks
  swat: [],
  drones: [],
  garageKind: save.garage || null,
  garageVehicleSaved: save.garageVehicle || null,
  xp: save.xp | 0,
  level: 1,
  stats: { swungM: 0, styleBest: 0, missions: 0, fares: 0, tanks: 0, jackpots: 0, ...(save.stats || {}) },
  ach: { ...(save.ach || {}) },
  suitSaved: save.suit || 'street',
  suitsOwnedSaved: save.suits || {},
  settings: runtime.settings(save),
  perks: { style: 1, melee: 1, webDur: 6, decay: 24, busted: 1.6 },
  waypoint: null,
  barks: [],
  tokensGot: [...(save.tokens || [])],
  slowmoT: 0,
};
world.web = web; // activities can tell when the player is web-swinging (web.attached)
world.level = 1 + Math.floor(Math.sqrt(world.xp / 120));
world.settings.gfxTier ||= world.settings.lowGfx ? 'low' : 'auto';
world.settings.lowGfx = gfxTier === 'low';
world.activity = createEntityActivity(world, camera, gfxTier);
world.activity.registerStatic(scene.children.filter(child => !preCityChildren.has(child) && !child.matrixAutoUpdate));
// Keep the new model close to the start, beside the central road.
const starter = runtime.profile.starterVehicle;
world.starterSedan = makeVehicle(scene, city.spawn.x + starter.offsetX, city.spawn.z + starter.offsetZ, 0,
  save.starterSedan?.color || starter.color, {
    ...save.starterSedan, modelId: starter.modelId,
    fuelLiters: save.starterSedan?.fuelLiters ?? starter.fuelLiters,
  });
world.parked.unshift(world.starterSedan);
world.starterSedan.assetReady.then(ok => {
  if (!ok && runtime.vehicle(starter.modelId)?.asset) showToast('Vehicle model unavailable — using the standard model');
});
world.bark = (pos, text) => {
  if (world.barks.length > 4) world.barks.shift();
  world.barks.push({ pos, text, t: 2.6, sx: -999, sy: -999 });
};

// rideable helicopters on the park helipads
for (const pad of city.helipads) {
  world.helis.push(makeHeli(scene, pad.x, pad.y, pad.z, Math.random() * Math.PI * 2, false));
}
let heliRespawnT = 0;

// missions + saved progress
initMissions(scene, world, save.missions || 0);
const shopsState = initShops(scene, world, save.upg, save.mods);
initOwnedVehicles(world, save, applyGarageMods);
const gang = initGang(scene, world, save.gang);
const flocks = initAmbient(scene);
const stuntsState = initStunts(scene, world);
ensureGarageVehicle(shopsState, world);
world.mapRamps = stuntsState.ramps;
world.mapSkulls = stuntsState.skulls;

// meta systems: properties/rep/dailies, the stadium arena, races, the harbor
world.cityFns = { blockStart, BLOCK };
initEconomy(scene, world, save);
initArena(scene, world, save);
const racesState = initRaces(scene, world, save);
const waterState = initWater(scene, world);
initDog(scene, world, save);
initHeist(scene, world, save);
initVaultHeist(scene, world, save);
initBombSquad(scene, world, save);
initAirTaxi(scene, world, save);
initBusRoute(scene, world, save);
initTowTruck(scene, world, save);
initGokart(scene, world, save);
initLockpick(scene, world, save);
initKaraoke(scene, world, save);
initMailRun(scene, world, save);
initTreasure(scene, world, save);
initLifeguard(scene, world, save);
initCatRescue(scene, world, save);
initWaterTaxi(scene, world, save);
initFireworks(scene, world, save);
initBillboard(scene, world, save);
initBarGames(scene, world, save);
initBowling(scene, world, save);
initArchery(scene, world, save);
initPinball(scene, world, save);
initBungee(scene, world, save);
initCarnival(scene, world, save);
initGarbage(scene, world, save);
initTurfWar(scene, world);
initVigilante(world, save);
initArmored(world);
initBlackjack({ onClose: leaveCards, onSlots: () => openSlots(world), onRoulette: () => openRoulette(world), onPoker: () => openPoker(world) });
initSlots({ onClose: leaveCards, onTable: () => openBlackjack(world), onRoulette: () => openRoulette(world) });
initRoulette({ onClose: leaveCards, onTable: () => openBlackjack(world), onSlots: () => openSlots(world) });
initPoker({ onClose: leaveCards, onTable: () => openBlackjack(world) });
initPropRaids(scene, world);
initJetpack(scene, world, save);
initAmbulance(scene, world);
initExport(scene, world, save);
initBounty(scene, world);
initBaseJump(scene, world);
initHoops(scene, world, save);
initUfo(scene, world);
initLottery(scene, world, save);
initFightClub(scene, world);
initLegend({ onClose: leaveCards, saveKey: SAVE_KEY }, world, save);
initFable(scene, world, save);
initFinale({
  freeze: () => { gameState = 'cards'; showTouchUI(false); document.exitPointerLock?.(); },
  unfreeze: leaveCards,
}, scene, world, save);
initPrestige(scene, world, save, { saveKey: SAVE_KEY }); // first: NG+ difficulty feeds the rest
initNemesis(scene, world, save);
initZombies(scene, world);
initTrain(scene, world);
initDisasters(scene, world);
initPrison(scene, world);
initMyths(scene, world, save);
initStranger(scene, world, save);
initCasinoHeist(scene, world, save);
initDerby(scene, world);
initPlane(scene, world);
initEmpire(scene, world, save);
initDiving(scene, world, save);
initPaparazzi(scene, world);
initMayor(scene, world, save);
initGauntlet(scene, world);
initSwingRaces(scene, world, save);
initFirefight(scene, world);
initMuseum(scene, world, save);
initFishing(scene, world);
initNightclub(scene, world, save);
initSkateboard(scene, world, save);
initKaiju(scene, world);
initSyndicate(scene, world, save);
initSkydive(scene, world);
initTournament(scene, world, save);
initCrew(scene, world, save);
initContracts(scene, world, save);
initSubway(scene, world);
initBusking(scene, world, save);
initWorkbench(scene, world, save);
initStormChaser(scene, world, save);
initFerry(scene, world);
initZipline(scene, world);
initBalloon(scene, world);
initDrone(scene, world);
initTaxi(world);
initValet(scene, world);
initCarwash(scene, world);
initBarber(scene, world, save);
initTattoo(scene, world, save);
initArmsdealer(scene, world);
initDruglab(scene, world, save);
initVendors(scene, world);
initAtms(scene, world, save);
initBanking(world, save); // after initAtms — extends world.bank
world.awardMoney = awardMoney; // reward routing for missions and jobs
initPayphones(scene, world, save);
initPigeons(scene, world, save);
initGraffiti(scene, world, save);
initHydrants(scene, world);
initSpeedcams(scene, world);
initGasStations(scene, world);
initRoadblocks(scene, world);
initGarageMulti(scene, world, save);
initCarRadioWheel(world);
initStreetFood(scene, world, save);
initChopShop(scene, world, save);
initImpound(scene, world);
initWeatherHazards(scene, world);
initPassengers(world, save);
initBlackout(scene, world);
initDemolition(scene, world);
initBountyHunter(scene, world, save);
initStreetRace(scene, world, save);
initSafehouses(scene, world, save);
initMeters(scene, world);
initEmotes(world);
initVehicleFx(world);
initBodyguard(scene, world, save);
initWildlife(scene, world);
initGym(scene, world, save);
initFortune(scene, world);
initDice(scene, world);
initHobo(scene, world, save);
initWingsuit(world);
initWebpull(world);
initTrainjack(world);
initBoatrace(scene, world, save);
initTrickpark(scene, world, save);
initElevators(scene, world);
initPizza(scene, world, save);
initRepo(scene, world, save);
initIcetruck(scene, world, save);
initNewschopper(scene, world, save);
initCopcareer(scene, world, save);
initStorerob(scene, world);
initJewelry(scene, world, save);
initPinkslip(scene, world, save);
initMostwanted(scene, world, save);
initBribe(world);
initLawyer(scene, world, save);
initStocks(scene, world, save);
initCasinoboss(scene, world, save);
initCalendar(world);
initMall(scene, world, save);
initSewer(scene, world, save);
initArcade(scene, world, save);
initGolf(scene, world, save);
initPokertourney(scene, world);
initChess(scene, world, save);
initGhosts(scene, world);
initBossrush(scene, world, save);
initPerks(scene, world, save);
initExplorer(world, save);
initArmor(scene, world, save);
initProperties(scene, world, save);
// newer activities claim their sites last, so older ones keep their places
initFoodTruck(scene, world, save);
initShellGame(scene, world, save);
initArmWrestle(scene, world, save);
initQuickDraw(scene, world, save);
initTrivia(scene, world, save);
initConnectFour(scene, world, save);
initWhackAMole(scene, world, save);
initFountain(scene, world, save);
initLivingStatue(scene, world, save);
initHedgeMaze(scene, world, save);
initStargazing(scene, world, save);
initWindowWasher(scene, world, save);
initClimbWall(scene, world, save);
initParkingWarden(scene, world, save);
initPickpocket(scene, world, save);
initDrivingSchool(scene, world, save);
initDragStrip(scene, world, save);
initHarborCrane(scene, world, save);
initCrabPots(scene, world, save);
initHorseBets(scene, world, save);
initRecycling(scene, world, save);
// show the newer activity sites on the maps by name
world.activityMarkers = [
  [world.foodTruck, 'Taco Loco'], [world.shellGame, 'Shell Game'], [world.armWrestle, 'Arm Wrestling'],
  [world.quickDraw, 'Quick-Draw Duel'], [world.trivia, 'Trivia Kiosk'], [world.connectFour, 'Four in a Row'],
  [world.whackAMole, 'Mole Mania'], [world.fountain, 'Wishing Fountain'], [world.livingStatue, 'Living Statue'],
  [world.hedgeMaze, 'Hedge Maze'], [world.stargazing, 'Observatory'],
  [world.windowWasher, 'Window Washer'], [world.climbWall, 'Climbing Wall'], [world.parkingWarden, 'Parking Warden'],
  [world.pickpocket, 'The Fence'], [world.drivingSchool, 'Driving School'], [world.dragStrip, 'Drag Strip'],
  [world.harborCrane, 'Harbor Crane'], [world.crabPots, 'Crab Shack'], [world.horseBets, 'Lucky Hooves OTB'],
  [world.recycling, 'Recycling'],
].filter(([site]) => site?.pos).map(([site, label]) => ({ pos: site.pos, label }));
initScars(scene, world);
initCloudSave(world);
initCityNews(world);
initNpcMemory(world);
initPhotoBounty(scene, world, camera, save, landmarks);

// Point the game's single save key at the active slot before anything reads it.
await bootActiveSlot();