require('dotenv').config({ path: 'sample.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require("mongoose");;
const mongo = require('mongodb');
const dns = require("dns");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
console.log(mongoose.connection.readyState);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

var urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});

var Url = mongoose.model("Url", urlSchema);

let urlExtractor = function(url) {
  var urlSplit = url.split('https://');
  if (urlSplit[1] == undefined) {
    return urlSplit[0].split('/')[0];
  } else {
    return urlSplit[1].split('/')[0];
  }
};

app.post(
  '/api/shorturl/new', 
  function(req, res, next) {
    var url = req.body.url;
    var domain = urlExtractor(url);
    dns.lookup(domain, (err, address) => {
      if(err) {
        console.log(address);
        res.json({
          error: 'invalid URL'
        });
      } else {
        next();
      };
    });
  },
  async function (req, res, next) {
    var { url } = req.body;
    console.log('2',url);
    let matchingUrl = await Url.find({ original_url: url });
    if (matchingUrl.length > 0) {
      res.send(matchingUrl[0]);
    } else {
      next();
    }
  },
  function (req, res) {
    var { url } = req.body;
    console.log('3',url);
    let shortUrl = Math.floor(Math.random()*999999999);

    let matchingShort = Url.find({ short_url: shortUrl });

    if (matchingShort.length > 0) {
      shortUrl = Math.floor(Math.random()*999999999);
    }

    let data = new Url({
      original_url: url,
      short_url: shortUrl
    });

    data.save(err => {
      if(err) {
        res.json({error: "try again"});
        return;
      }
    });

  res.json(data);
  }
);

app.get('/api/shorturl/:shortUrl', async function (req, res) {
  const { shortUrl } = req.params;
  var matchingUrl = await Url.find({ short_url: shortUrl });
  if (matchingUrl.length > 0) {
    var destination = matchingUrl[0].original_url;
    var httpRegex = /^(https:\/\/)/;
    if (!httpRegex.test(destination)) {
      destination = 'https://' + destination;
    };
    res.redirect(destination);
  } else {
    res.json ({error: 'invalid short URL'});
    return;
  };
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});