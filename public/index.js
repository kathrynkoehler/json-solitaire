// in json, results are grouped by SKU
  // search results page is grouped by PRODUCT
  // so 1 product (a shoe) could come in 2 colors * 10 sizes = 20 SKUs

'use strict';

(function () {

  window.addEventListener('load', init);
  
  // product json file to parse
  //const FILE = '/json-files/sonic pink.json';

  // directory holding all json files to parse
  const DIRECTORY = '/json-files';
  // holds extracted details from json
  let allDetails = [];

  // once the page loads we can start appending data
  async function init() {
    try {
      let fileNames = await grabAllJson();
      for (let i = 0; i < fileNames.length; i++) {
        console.log(fileNames[i]);
        await grabOneJson(fileNames[i]);
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
      decomposeSKU(data, filename);
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

  function decomposeProduct() {
    // collate the results for all SKUs under one product card
    // allow cards to be clicked on => expanded to view all SKUs 
  }

  // decompose json file into sku_productID, score, image, and details
  function decomposeSKU(data, filename) {
    const skus = data["debug"]["explain"];
    let item;
    let value;
    filename = filename.split(" ").join("-");
    filename = filename.split(".").join("-");
    addHeader(filename);
    for (item in skus) {
      let prodId = item.split('_').slice(1)[0];
      //console.log(prodId);
      value = skus[item].value;
      //console.log(skus[item]["details"]);
      let productData = getImage(data, prodId);
      let details = extractDetails(skus[item]);
      // write details to new file so we don't have to do it on every page load
      //console.log(details);
      addToPage(item, value, productData, details, filename);
    }
  }

  // write details to new file so we don't have to do it on every page load!
  async function writeDetails() {
    try {

    } catch (err) {

    }
  }

  // add new section for each file
  function addHeader(filename) {
    let section = gen('section');
    section.id = filename;
    let heading = gen('h1');
    heading.textContent = filename;

    section.appendChild(heading);

    let parent = qs('body');
    parent.appendChild(section);
  }

  // add data to page
  function addToPage(id, value, productData, details, filename) {
    const photo = gen('img');
    photo.src = productData[0];
    photo.alt = productData[1];
    
    const title = gen('h1');
    title.textContent = productData[1];

    const prodId = gen('h2');
    prodId.textContent = 'ID: ' + id;

    const score = gen('h3');
    score.textContent = 'Score: ' + value;

    // drop down!
    // const dropDownButton = gen('button');
    // dropDownButton.textContent = 'Score Components';
    // dropDownButton.classList.add('collapsible');
    // const dropDownContainer = gen('article');
    // dropDownContainer.classList.add('content');
    // //dropDownContainer.classList.add('hidden');
    // for (let i = 0; i < details.length; i++) {
    //   const dropDownContent = gen('p');
    //   dropDownContent.textContent = details[i][0] + ' = ' + details[i][1];
    //   dropDownContainer.appendChild(dropDownContent);
    // }

    const article = gen('article');
    article.classList.add('card');
    article.appendChild(photo);
    article.appendChild(title);
    article.appendChild(prodId);
    article.appendChild(score);
    // drop down!
    //article.appendChild(dropDownButton);
    //article.appendChild(dropDownContainer);
    //console.log(filename);
    const parent = document.getElementById(`${filename}`);
    parent.appendChild(article);

    collapse();
  }

  // grabs image and display name from details
  function getImage(data, prodId) {
    let docs = data["response"]["docs"];
    let item;
    for (item in docs) {
      if (docs[item]["product_id"] === prodId) {
        let productData = [];
        productData.push(docs[item]["sku_skuImages"][0]);
        productData.push(docs[item]["product_displayName"]);
        return productData;
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

  // make the collapsible lists
  function collapse() {
    let lists = qsa(".collapsible");
    for (let i = 0; i < lists.length; i++) {
      lists[i].addEventListener('click', () => {
        lists[i].classList.toggle('active');
        let content = lists[i].nextElementSibling;
        //console.log(content);
        content.classList.toggle('hidden');
      });
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