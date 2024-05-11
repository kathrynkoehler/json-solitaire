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

  async function init() {
    try {
      let fileNames = await grabAllJson();
      for (let i = 0; i < fileNames.length; i++) {
        console.log(fileNames[i]);
        await grabOneJson(fileNames[i]);
        // write details to new file so we don't have to do it on every page load
        await writeProducts();
        await writeDetails();
      }
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
      await decomposeSKU(data);

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

  // object example for reference!!
  // let object = {
  //   'productId': prodId,
  //   'displayName' : '',
  //   'score': value,
  //   'skus': [
  //     {
  //       'skuId': '',
  //       'skuScore': 0,
  //       'skuImg': ''
  //     }
  //   ]
  // }

  // decompose json file and extract useful fields to save for each product
  // also extract details and save score breakdowns
  function decomposeSKU(data) {
    const skus = data["debug"]["explain"];
    let item;
    let value;

    for (item in skus) {
      let prodId = item.split('_').slice(1)[0];
      value = skus[item].value;

      // check if product id already has an object
      if (allProducts.prodId) {
        setData(data, allProducts.prodId);
      } else {
        let object = {
          'productId': prodId,
          'displayName' : '',
          'score': value,
          'skus': []
        }
        setData(data, object);
        allProducts.prodId = object;
      }

      // extract details for every sku_prodid item
      if (allDetails.item) {
        allDetails.item.push(extractDetails(item));
      } else {
        allDetails.item = [(extractDetails(item))];
      }
    }
  }

  // write product data to new file so we don't have to do it on every page load!
  async function writeProducts() {
    try {
      let data = new FormData();
      data.append('content', allProducts)
      let res = await fetch('/write/products');
      await statusCheck(res);
    } catch (err) {

    }
  }

  // write product details to new file so we don't have to do it on every page load!
  async function writeDetails() {
    try {
      let data = new FormData();
      data.append('content', allDetails)
      let res = await fetch('/write/details');
      await statusCheck(res);
    } catch (err) {
      console.error(err);
    }
  }

  // grabs image and display name from details
  function setData(data, object) {
    let docs = data["response"]["docs"];
    
    let item;
    for (item in docs) {
      if (object.productId === prodId) {
        object.displayName = docs[item]["product_displayName"];
        object.skus.push(
          {
            'skuId': docs[item]["sku_id"], 
            'skuScore': docs[item]["score"],
            'skuImg': docs[item]["sku_skuImages"][0]
          }
        );

        return object;
      }
    }
    
  }
  
  // param: skus[item] from decompose
  // recursively calls self until no details field left
  function extractDetails(item) {
    // for each field in json obj, check if it's details
    Object.keys(item).forEach(key => {
      if (typeof item[key] === 'object' && item[key] !== null && key === "details") {
        // if details, pull out the score and description
        let short = item["details"];
        for (let i = 0; i < short.length; i++) {
          allDetails.push([short[i]["description"], short[i]["value"]]);
          // then check for more details
          extractDetails(short[i]);
        }
        // when finished with one obj, do the other nested ones too
        //extractDetails(item["details"]);
      } else {
        console.log(allDetails);
        return allDetails;
      }
    });
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