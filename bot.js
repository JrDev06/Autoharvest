const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const bot = mineflayer.createBot({
  host: 'RiseSMPMC.aternos.me', // Minecraft server IP
  port: 46779,       // Minecraft server port
  username: 'FarmerBOT' // Bot username (use an offline mode server)
});

bot.loadPlugin(pathfinder);

let farmArea = null;

bot.on('spawn', () => {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  bot.pathfinder.setMovements(movements);

  detectFarmArea(mcData);

  // Schedule the harvesting and replanting task every 5-10 minutes
  const interval = getRandomInterval(5 * 60 * 1000, 10 * 60 * 1000); // 5-10 minutes in milliseconds
  setInterval(harvestAndPlantCrops, interval);
});

function detectFarmArea(mcData) {
  // Look for farmland within a certain radius
  const farmBlocks = bot.findBlocks({
    matching: mcData.blocksByName.farmland.id,
    maxDistance: 50,
    count: 50,
  });

  if (farmBlocks.length > 0) {
    // Calculate the center of the farm area
    const avgX = farmBlocks.reduce((sum, pos) => sum + pos.x, 0) / farmBlocks.length;
    const avgY = farmBlocks.reduce((sum, pos) => sum + pos.y, 0) / farmBlocks.length;
    const avgZ = farmBlocks.reduce((sum, pos) => sum + pos.z, 0) / farmBlocks.length;

    farmArea = {
      x: Math.round(avgX),
      y: Math.round(avgY),
      z: Math.round(avgZ),
      range: 10 // Adjust the range as needed
    };

    bot.chat(`Farm area detected at (${farmArea.x}, ${farmArea.y}, ${farmArea.z})`);
    bot.pathfinder.setGoal(new GoalNear(farmArea.x, farmArea.y, farmArea.z, farmArea.range));
  } else {
    bot.chat('No farm area found within the specified range.');
  }
}

function harvestAndPlantCrops() {
  if (!farmArea) {
    bot.chat('Farm area not detected.');
    return;
  }

  const mcData = require('minecraft-data')(bot.version);
  const seeds = mcData.itemsByName.wheat_seeds;

  // Move to the farm area
  bot.pathfinder.setGoal(new GoalNear(farmArea.x, farmArea.y, farmArea.z, farmArea.range));

  // Harvest crops
  const crops = bot.findBlocks({
    matching: mcData.blocksByName.wheat.id,
    maxDistance: 10,
    count: 50,
  });

  crops.forEach(crop => {
    if (bot.blockAt(crop).metadata === 7) { // Fully grown wheat
      bot.dig(bot.blockAt(crop), () => {
        bot.placeBlock(bot.blockAt(crop).position.offset(0, -1, 0), bot.heldItem, () => {
          bot.chat('Replanted crop');
        });
      });
    }
  });
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  if (message === 'start') {
    harvestAndPlantCrops();
  }
});

bot.on('error', (err) => console.log(err));
