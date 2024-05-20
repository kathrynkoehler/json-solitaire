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
        //offsetCards();
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
            allProducts[file][product]['skus'][sku]['skuScore'], 
            allProducts[file][product]['skus'][sku], sku,
            file);
        }
        addProductCard(allProducts[file][product]['skus'], 
          product, 
          //allProducts[file][product]['skus'][sku],
          file);
      }
      
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

  // put each product in its own group within the file card list
  function addProductSection(product, file) {
    let section = gen('section');
    section.classList.add(product['productId']);
    section.classList.add('product-container');

    let parent = document.getElementById(`${file}`);
    parent.appendChild(section);
  }

  // add primary product card to page
  function addProductCard(data, productId, filename) {
    // const photoDiv = gen('div');
    // photoDiv.classList.add('photo');
    // const photo = gen('img');
    // photo.src = skuData['skuImg'];
    // photo.alt = data['displayName'];
    // photoDiv.appendChild(photo);
    let scores = productScores(data);
    
    const title = gen('h1');
    title.textContent = data['displayName'];
    const prodId = gen('h2');
    prodId.textContent = 'ID: ' + productId;
    const average = gen('h2');
    average.textContent = 'Score average: ' + scores[1];
    const max = gen('h2');
    max.textContent = 'Score maximum: ' + scores[2];
    const min = gen('h2');
    min.textContent = 'Score minimum: ' + scores[3];
    const count = gen('h2');
    count.textContent = 'SKU count: ' + scores[0];

    const contents = gen('div');
    contents.classList.add('card-contents');
    contents.appendChild(title);
    contents.appendChild(prodId);
    contents.appendChild(average);
    contents.appendChild(max);
    contents.appendChild(min);
    contents.appendChild(count);

    const article = gen('article');
    article.classList.add('product-card');
    article.classList.add('title-card');
    //article.appendChild(photoDiv);
    article.appendChild(contents);

    const parent = document.getElementById(`${filename}`);
    const prodContainer = qs(`#${filename} .${productId}`);
    prodContainer.appendChild(article);
    parent.appendChild(prodContainer);
  }

  // compiles data about a product's skus' scores
  function productScores(product) {
    let count = 0;
    let total = 0;
    let max = 0;
    let min = 5000000000;

    let sku;
    for (sku in product) {
      let current = parseFloat(product[sku]['skuScore']);
      total += current;
      count ++;
      if (current > max) max = current;
      if (current < min) min = current;
    }
    let average = total / count;
    return [count, average, max, min];
  }

  // add SKU card to page
  function addCard(data, value, skuData, sku, filename) {
    const photoDiv = gen('div');
    photoDiv.classList.add('photo');
    const photo = gen('img');
    photo.src = skuData['skuImg'];
    photo.alt = data['displayName'];
    photoDiv.appendChild(photo);
    
    const title = gen('h1');
    title.textContent = data['displayName'];
    const prodId = gen('h2');
    prodId.textContent = 'ID: ' + data['productId'];
    const skuId = gen('h2');
    skuId.textContent = 'SKU: ' + sku;
    const score = gen('h2');
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
    });

    const contents = gen('div');
    contents.classList.add('card-contents');
    contents.appendChild(title);
    contents.appendChild(prodId);
    contents.appendChild(skuId);
    contents.appendChild(score);
    contents.appendChild(dropDownButton);
    contents.appendChild(dropDownContainer);

    const article = gen('article');
    article.classList.add('product-card');
    article.appendChild(photoDiv);
    article.appendChild(contents);

    const parent = document.getElementById(`${filename}`);
    const prodContainer = qs(`#${filename} .${data['productId']}`);
    prodContainer.appendChild(article);
    parent.appendChild(prodContainer);
  }

  // adjust offset of cards based on position in stack
  function offsetCards() {
    let sections = qsa('body > section');
    for (let i = 0; i < sections.length; i++) {
      //console.log(sections[i]);
      let products = qsa(`#${sections[i].id} > section`);
      for (let k = 0; k < products.length; k++) {
        let classname = products[k].classList[0];
        let cards = qsa(`.${classname} .product-card`);
        for (let m = 0; m < cards.length; m++) {
          let move = m * 10;
          cards[m].style.transform = `translateX(-${move}px)`;
          console.log(cards[m]);
        }
      }
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