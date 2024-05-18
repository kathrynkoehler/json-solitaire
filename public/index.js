/**
 * Responsible for building interface. 
 * Reads in data that has already been "cleaned" by decompose.js, then parses 
 * it out into elements to display to the user on load.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  // directory holding all json files to parse
  const PRODUCTS = 'public/cleaned-data/allProducts.json';
  // holds extracted product details from json
  let allProducts = {};

  // once the page loads we can start appending data
  async function init() {
    try {
      await setTimeout(async () => {
        allProducts = await getData();
        console.log(allProducts);
        buildInterface();
      }, 500);
      
    } catch (err) {
      console.error('init ' + err);
    }
  }

  async function getData() {
    try {
      let res = await fetch('/clean');
      await statusCheck(res);
      let data = await res.json();
      return data;
    } catch (err) {
      console.error('get data: ' + err); 
    }
  }

  function buildInterface() {
    // for each 'file' object in allProducts, build header separator
    let file;
    for (file in allProducts) {
      addHeader(file);

      // for each product in file, grab displayname, score, and skus
      let product;
      for (product in allProducts[file]) {
        addProductSection(allProducts[file][product], file);

        // for each sku in product, add card to page with image, score
        let sku;
        for (sku in allProducts[file][product]['skus']) {
          addCard(allProducts[file][product], 
            allProducts[file][product]['score'], 
            allProducts[file][product]['skus'][sku], sku,
            file);
        }
      }  

    }
    collapse();
  }

  /*
    Object.keys(allProducts).forEach((file) => {
      addHeader(file);

      // for each 
      Object.keys(file).forEach((product) => {
        console.log(product);

        Object.keys(product).forEach((sku) => {
          console.log(sku);
          addToPage(product, product['score'], product['skus'][sku], file);
        });
        
      });
      
    });
  */

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

  // put each product in its own group within the file card list
  function addProductSection(product, file) {
    let section = gen('section');
    section.classList.add(product['productId']);
    section.classList.add('product-container');

    let parent = document.getElementById(`${file}`);
    parent.appendChild(section);
  }

  // add data card to page
  function addCard(data, value, skuData, sku, filename) {
    const photo = gen('img');
    photo.src = skuData['skuImg'];
    photo.alt = data['displayName'];
    
    const title = gen('h1');
    title.textContent = data['displayName'];

    const prodId = gen('h2');
    prodId.textContent = 'ID: ' + data['productId'];

    const skuId = gen('h2');
    skuId.textContent = 'SKU: ' + sku;

    const score = gen('h3');
    score.textContent = 'Score: ' + value;

    // drop down!
    const dropDownButton = gen('button');
    dropDownButton.textContent = 'Score Components';
    dropDownButton.classList.add('collapsible');

    const dropDownContainer = gen('article');
    dropDownContainer.classList.add('content');
    dropDownContainer.classList.add('hidden');

    const dropDownContent = gen('p');
    dropDownContent.textContent = 'FILLER!!!';
    dropDownContainer.appendChild(dropDownContent);

    // let details = allDetails[id];
    // for (let i = 0; i < details.length; i++) {
    //   const dropDownContent = gen('p');
    //   dropDownContent.textContent = details[i][0] + ' = ' + details[i][1];
    //   dropDownContainer.appendChild(dropDownContent);
    // }

    dropDownButton.addEventListener('click', () => {
      dropDownButton.classList.toggle('active');
      let content = dropDownButton.nextElementSibling;
      content.classList.toggle('hidden');
      console.log(content);
    });

    const article = gen('article');
    article.classList.add('product-card');
    article.appendChild(photo);
    article.appendChild(title);
    article.appendChild(prodId);
    article.appendChild(skuId);
    article.appendChild(score);

    article.appendChild(dropDownButton);
    article.appendChild(dropDownContainer);

    const parent = document.getElementById(`${filename}`);
    const prodContainer = qs(`#${filename} .${data['productId']}`);
    prodContainer.appendChild(article);
    parent.appendChild(prodContainer);
  }

  // make the collapsible lists
  function collapse() {
    //console.log('collapse');
    let lists = qsa(".collapsible");
    for (let i = 0; i < lists.length; i++) {
      //console.log(lists[i]);
      lists[i].addEventListener('click', () => {
        lists[i].classList.toggle('active');
        let content = lists[i].nextElementSibling;
        content.classList.toggle('hidden');
        //console.log(content);
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