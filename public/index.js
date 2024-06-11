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

  // gets all cleaned product data
  async function getData() {
    try {
      let res = await fetch('/clean/products');
      await statusCheck(res);
      let data = await res.json();
      return data;
    } catch (err) {
      console.error('get data: ' + err); 
    }
  }

  // adds all cards to page, separated by search file
  async function buildInterface() {
    // create search dropdown
    await search();

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
          await addCard(allProducts[file][product], 
            allProducts[file][product]['skus'][sku]['skuScore'], 
            allProducts[file][product]['skus'][sku], sku,
            file);
        }
        addProductCard(allProducts[file][product]['skus'], 
          product, 
          allProducts[file][product],
          //allProducts[file][product]['skus'][sku],
          file);
      }
    }
    scoreIndent();
  }

  // add new section for each file
  function addHeader(filename) {
    let section = gen('section');
    section.id = filename;
    let heading = gen('h1');
    heading.textContent = filename;

    section.appendChild(heading);

    let parent = document.getElementById("items");
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

  // add title product card to page
  function addProductCard(data, productId, displayName, filename) {
    // const photoDiv = gen('div');
    // photoDiv.classList.add('photo');
    // const photo = gen('img');
    // photo.src = skuData['skuImg'];
    // photo.alt = data['displayName'];
    // photoDiv.appendChild(photo);
    let scores = productScores(data);
    
    const search = gen('h1');
    search.textContent = "search: " + filename.split("-").join(" ");
    search.classList.add("card-search");
    const title = gen('h1');
    title.textContent = displayName['displayName'];
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
    contents.appendChild(search);
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
  async function addCard(data, value, skuData, sku, filename) {

    // the card that we'll assemble below
    const card = gen('article');
    card.classList.add('product-card');
  
    // add photo
    const photoDiv = gen('div');
    photoDiv.classList.add('photo');
    const photo = gen('img');
    photo.src = skuData['skuImg'];
    photo.alt = data['displayName'];
    photoDiv.appendChild(photo);
    
    // add title, productID, SKUID, overall score
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
    const dropDownContainer = await scoreList(filename, 
      sku + '_' + data['productId'], card);

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

    card.appendChild(photoDiv);
    card.appendChild(contents);

    const parent = document.getElementById(`${filename}`);
    const prodContainer = qs(`#${filename} .${data['productId']}`);
    prodContainer.appendChild(card);
    parent.appendChild(prodContainer);
  }

  // add the score breakdown to a card
  async function scoreList(filename, itemId, card) {
    // itemId = sku_prod, stitched back together
    const dropDownContainer = gen('article');
    dropDownContainer.classList.add('content');
    dropDownContainer.classList.add('hidden');
    
    let file = await readDetails(filename);

    let item;
    for (item in file) {
      if (item === itemId) {
        //console.log(item);
        let score;
        for (score in item) {
          const div = gen('div');
          //console.log(file[item][score]);
          const description = gen('p');
          description.textContent = file[itemId][score][1];
          description.classList.add("detail-desc");
          let indent = "indent-" + file[itemId][score][0];
          description.classList.add(indent);
          const value = gen('p');
          value.textContent = file[itemId][score][2];
          value.classList.add("detail-val");

          div.appendChild(description);
          div.appendChild(value);
          dropDownContainer.appendChild(div);
        }
      }
    }
    return dropDownContainer;
  }

  function scoreIndent() {
    console.log("scoreindent");
    // apply indent: file[itemId][score][0] number!
        // to push right: add margin to left side of div, (change width?)
        // could also color code to make it easier to see?
    // add class to card for each boost
    for (let i = 1; i < 7; i++) {
      let desc = qsa(`.indent-${i}`);
      for (let k = 0; k < desc.length; k++) {
        //console.log("3");
        // let current = Array.from(divs[i].children);
        // console.log(current);
        // console.log(current[0]);
        let indent = i * 8;
        console.log(indent);
        desc[k].style.marginLeft = `${indent}px`;
        desc[k].style.maxWidth = `${desc[k].style.maxWidth - indent}%`;
      }
    }

    // let divs = qsa(".content > div");
    // for (let i = 0; i < divs.length; i++) {
    //   let desc = divs[i].children[0];
    //   let indent = desc.classList.split(" ")[1].split("-")[1] * 2;
    //   desc.style.margin = indent;
    // }

  }

  // creates dropdown to select which file to show cards for
  async function search() {
    try {
      let res = await fetch('/files');
      await statusCheck(res);
      let data = await res.json();

      let parent = qs("select");
      
      for (let i = 0; i < data.length; i++) {
        let name = data[i].split(".")[0];
        //console.log(name);
        let option = gen("option");
        option.value = name;
        option.textContent = name;
        parent.appendChild(option);
      }

      let all = gen("option");
      all.value = "all";
      all.textContent = "all files";

      qsa("option")[0].selected = true;
      //all.selected = true;
      parent.appendChild(all);
      
    } catch (err) {
      console.error('get data: ' + err); 
    }
  }

  // hide non-selected search contents
  function hideSections() {
    let selection = qs("select").value;
    if (selection !== "all files") {
      let sections = qsa("#items > section");
      let filename = selection.split(" ").join("-");
      //filename = filename.split(".")[0];
      for (let i = 0; i < sections.length; i++) {
        
      }
    }
  }

  // dynamically add checkboxes to sidebar to filter cards by boost
  function sidebarOptions() {
    // dynamically add checkboxes to a sidebar to filter the cards
    // by the boosts added to them

    // qsa for all checkboxes
    // loop over to check that none of their ids/text match the val description
    // if no match, add to list as a check to exclude all other cards
  }

  function sidebarTitle() {
    // add title a la lulu website for search being shown. 
    // Showing results for:
    // [file name] -- make sure spaces are not dashes, and .json is elided
    // add line break before check boxes
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

  // a bandaid for not being able to keep all details in one file. VERY VERY inefficient!!
  async function readDetails(filename) {
    //filename = filename.split('-json')[0];
    try {
      let res = await fetch('/clean/details/' + filename);
      await statusCheck(res);
      let data = await res.json();
      //console.log(data);
      return data;
    } catch (err) {
      console.error('get data: ' + err); 
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