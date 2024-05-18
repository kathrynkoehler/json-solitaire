/**
 * decompose the json files into more accessible versions that are quicker
 * to read from
 */


'use strict';

(function () {

  // directory holding all json files to parse
  const DIRECTORY = '/json-files';
  // holds extracted details from json
  let allDetails = {};
  let allProducts = {};

  window.addEventListener('load', init);

  async function init() {
    try {
      let fileNames = await grabAllJson();
      for (let i = 0; i < fileNames.length; i++) {
        console.log(fileNames[i]);
        await grabOneJson(fileNames[i]);
        // write details to new file so we don't have to do it on every page load
        //console.log(allProducts);
        
        //await writeDetails();
      }
      await writeProducts();
    } catch (err) {
      console.error('init ' + err);
    }
  }

  // grabs the product data for ONE json file
  async function grabOneJson(filename) {
    try {
      let res = await fetch(`/files/${filename}`);
      await statusCheck(res);
      let data = await res.json();
      // decompose products, then write to new file from allProducts
      filename = filename.split(" ").join("-");
      filename = filename.split(".").join("-");
      await decomposeSKU(data, filename);
    } catch (err) {
      console.log(err);
    }
  }

  // grabs the product data for ALL json files in directory
  async function grabAllJson() {
    try {
      let res = await fetch('/files');
      await statusCheck(res);
      let data = await res.json();
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  // decompose json file and extract useful fields to save for each product
  // also extract details and save score breakdowns
  function decomposeSKU(data, filename) {
    const skus = data["debug"]["explain"];
    let item;
    let value;
    allProducts[filename] = {};

    for (item in skus) {
      let prodId = item.split('_').slice(1)[0];
      let skuId = item.split('_')[0];
      //console.log(skuId);
      value = skus[item].value;

      // check if product id already has an object
      //console.log(allProducts[prodId]);
      let object = setData(data, prodId);

      if (!allProducts[filename][prodId]) {
        allProducts[filename][prodId] = {
          'productId': prodId,
          'displayName' : object[0],
          'score': value,
          'skus': {}
        }
      }
      allProducts[filename][prodId]['skus'][skuId] = {
        'skuScore': {}, 
        'skuImg': object[1]
      };
      
      // extract details for every sku_prodid item
      //allDetails[filename][item] = ((skus[item]));
    }
    //console.log(allProducts);
    //console.log(allDetails);
  }

  // grabs image and display name from "response" "docs" object in files
  function setData(data, productId) {
    let docs = data["response"]["docs"];
    let item;
    for (item in docs) {
      if (docs[item]["product_id"] === productId) {
        let array = [docs[item]["product_displayName"], docs[item]["sku_skuImages"][0]];
        //console.log(array);
        return array;
      }
    }
    
  }
  
  // param: skus[item] from decompose
  // this function has lowered my iq by 10 points at least
  function extractDetails(item) {
    // for each field in json obj, check if it's 'details'
    let object = [];
    //console.log(item);
    Object.keys(item).forEach(key => {
      if (typeof item[key] === 'object' && item[key] !== null && key === "details") {
        // if details, pull out the score and description
        console.log('HERE!!');
        let short = item["details"];
        //console.log('SHORT: ' + JSON.stringify(short));
        //console.log((short));
        for (let i = 0; i < short.length; i++) {
          //console.log(short[i]["value"]);
          object.push([short[i]["description"], short[i]["value"]]);
          //console.log(object[item][short[i]["description"]]);
          // then check for more details
          extractDetails(short[i]);
        }
        // when finished with one obj, do the other nested ones too
        extractDetails(item["details"]);
      } else {
        //console.log(object);
        return object;
      }
    });
  }

  // write product data to new file so we don't have to do it on every page load
  async function writeProducts() {
    //console.log('inside write');
    try {
      // first grab what's already in the file so we don't overwrite it
      // let res = await fetch(`/cleaned-data/allProducts.json`);
      // await statusCheck(res);
      // let contents = await res.json();
      
      // append new product data to existing contents

      // filename = filename.split(" ").join("-");
      // filename = filename.split(".").slice(1)[0];

      let data = new FormData();
      // contents[filename] = JSON.stringify(allProducts);
      data.append('content', JSON.stringify(allProducts));
      let res2 = await fetch('/write/products', {method: 'POST', body: data});
      await statusCheck(res2);
    } catch (err) {
      console.error(err);
    }
  }

  // write product details to new file so we don't have to do it on every page load!
  async function writeDetails() {
    try {
      let data = new FormData();
      //console.log(allDetails);
      data.append('content', JSON.stringify(allDetails));
      let res = await fetch('/write/details', {method: 'POST', body: data});
      await statusCheck(res);
    } catch (err) {
      console.error(err);
    }
  }

  
  /* HELPERS!! */

  // statuscheck for fetch
  async function statusCheck(response) {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  function id(idName) {
    return document.getElementById(idName);
  }

  function qs(query) {
    return document.querySelector(query);
  }

  function qsa(query) {
    return document.querySelectorAll(query);
  }

  function gen(tag) {
    return document.createElement(tag);
  }


})();