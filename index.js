const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

const Sequelize = require('sequelize');
const Op = Sequelize.Op;


app.get('/api/games', async (req, res) => {
  try {
    const games = await db.Game.findAll()
    return res.send(games)
  } catch (err) {
    console.error('There was an error querying games', err);
    return res.send(err);
  }
})

app.post('/api/games', async (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  try {
    const game = await db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    return res.send(game)
  } catch (err) {
    console.error('***There was an error creating a game', err);
    return res.status(400).send(err);
  }
})

app.post('/api/games/search', async (req, res) => {
  const { name, platform } = req.body;
  const filter = {name: { [Op.like]: '%' + name + '%' }};
  if ( platform !== '') filter.platform = platform;
  try {
    const games = await db.Game.findAll({
      where: filter
    });
    return res.send(games);
  } catch (err) {
    console.error('***Error searching game', err);
    return res.status(400).send(err);
  }
})

app.post('/api/games/populate', async (req, res) => {
  try {
    const url1 = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json';
    const url2 = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json';

    const [response1, response2] = await Promise.all([fetch(url1), fetch(url2)]);
    const data1 = await response1.json();
    const data2 = await response2.json();
    const mergedData = [...data1.flat().slice(0, 100), ...data2.flat().slice(0, 100)].flat();
    const games = mergedData.map(game => ({
      publisherId: game.publisher_id,
      name: game.name,
      platform: game.os,
      storeId: game.id,
      bundleId: game.bundle_id,
      appVersion: game.version,
      isPublished: true
    }));
    try {
      await db.Game.truncate();
      await db.Game.bulkCreate(games);
      return res.send({ state: 'ok'  })

    } catch (error) {
      console.error('***Error populating games', err);
      return res.status(400).send(err);
    }

  } catch (error) {
    console.error('Error fetching JSON:', error);
  }
})

app.delete('/api/games/:id', async (req, res) => {
  try {
    const game = await db.Game.findByPk(parseInt(req.params.id))
    await game.destroy({ force: true })
    return res.send({ id: game.id  })
  } catch (err) {
    console.error('***Error deleting game', err);
    return res.status(400).send(err);
  }
});

app.put('/api/games/:id', async (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  try {
    const game = await db.Game.findByPk(id)
    await game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    return res.send(game)
  } catch (err) {
    console.error('***Error updating game', err);
    return res.status(400).send(err);
  }
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
