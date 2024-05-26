"use strict";

const express = require("express");
const app = express();
const multer = require("multer");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(multer().none());
const fs = require('fs').promises;

const DIRECTORY = './public/json-files';

// gets entire directory of files
app.get('/files', async (req, res) => {
  try {
    let files = await getFiles();
    res.json(files);
  } catch (err) {
    res.status(400).type('text').send("couldn't get all files");
  }
});

// gets one file
app.get('/files/:filename', async (req, res) => {
  try {
    let file = await readFile(DIRECTORY + '/' + req.params.filename);
    res.json(file);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(400).type('text').send(`${filename} does not exist`);
    } else {
      res.status(400).type('text').send(`couldn't get file ${filename}`);
    }
  }
});

// gets cleaned version of products file
app.get('/clean/', async (req, res) => {
  try {
    let file = await readFile('./public/cleaned-data/allProducts.json');
    res.json(file);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(400).type('text').send(`does not exist`);
    } else {
      res.status(400).type('text').send(`couldn't get file`);
    }
  }
});

// writes useful product data to new file
app.post('/write/products', async (req, res) => {
  try {
    res.type('text')
    let content = (req.body.content);
    if (content) {
      await fs.writeFile('./public/cleaned-data/allProducts.json', (content));
      res.send('write success!');
    } else {
      res.status(400).send('write fail :( no content');
    }
  } catch (err) {
    res.status(500).send('write error! - ' + err);
  }
});

// writes product score breakdowns to new file
app.post('/write/details', async (req, res) => {
  try {
    res.type('text');
    let file = req.body.file;
    let content = req.body.content;

    if (content) {
      await fs.writeFile('./public/cleaned-data/details-' + file, content);
      res.send('write success!');
    } else {
      res.status(400).send('write fail :( no content');
    }
  } catch (err) {
    res.status(400).send('write error: ' + err);
  }
});

// get all files names from directory, return array of strings
async function getFiles() {
  try {
    let fileList = await fs.readdir(DIRECTORY);
    console.log(fileList);
    return fileList;
  } catch (err) {
    console.err('getfiles failed ' + err);
  }
}

// read one file
async function readFile(filename) {
  try {
    let contents = await fs.readFile(filename);
    return JSON.parse(contents);
  } catch (err) {
    console.err('readfile failed ' + err);
  }
}


// tells the code to serve static files in a directory called 'public'
app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);
