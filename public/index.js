/**
 * Responsible for building interface. 
 * Reads in data that has already been "cleaned" by decompose.js, then parses 
 * it out into "cards" to display to the user on load.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  // directory holding all json files to parse
  const PRODUCTS = 'public/cleaned-data/allProducts.json';

  // holds extracted product details from json
  let allProducts = {};

  /**
   * initializes the page upon load. retrieves cleaned product data to build
   * interface and handle interactivity. 
   */
  async function init() {
    try {
      await setTimeout(async () => {
        allProducts = await getData();
        await buildInterface();
        let select = qs('select');
        select.addEventListener('change', () => {
          hideSections();
          sidebarTitle();
        });
        //offsetCards();
      }, 500);
    } catch (err) {
      console.error('init ' + err);
    }
  }

  /**
   * retrieves all cleaned product data from cleaned-data directory.
   * @returns JSON object of formatted data for all products
   */
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

  /**
   * adds all cards to page, separated by search file. 
   */
  async function buildInterface() {
    // create search dropdown
    await search();
    sidebarTitle();

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
    hideSections();
  }

/**
 * add new section for each file
 * @param {String} filename 
 */
  function addHeader(filename) {
    let section = gen('section');
    section.id = filename;

    // let heading = gen('h1');
    // heading.textContent = filename;
    //section.appendChild(heading);

    let parent = document.getElementById("items");
    parent.appendChild(section);
  }

  /**
   * put each product in its own group within the file card list
   * @param {Object} product - JSON object of product details
   * @param {String} file - the file the item was returned from. used to correctly
   *                        place the section on the page
   */
  function addProductSection(product, file) {
    let section = gen('section');
    section.classList.add(product['productId']);
    section.classList.add('product-container');

    let parent = document.getElementById(`${file}`);
    parent.appendChild(section);
  }

  /**
   * add title product card to card stack
   * @param {Object} data - JSON object of product data
   * @param {String} productId - ID of product
   * @param {String} displayName - Display name of product
   * @param {String} filename - file the item was returned from
   */
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

  /**
   * compiles data about a product's skus' scores.
   * @param {Object} product 
   * @returns Array of numbers for various calculated aggregates
   */
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

  /**
   * build and add SKU card to page
   * @param {Object} data - JSON object containing data about the item
   * @param {Number} value - total score of SKU
   * @param {Array} skuData - details about the SKU, used to retrieve image
   * @param {String} sku - the SKU of the item
   * @param {String} filename - the file the product was returned from. used to place
   *                      the card correctly on the page
   */
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
    dropDownButton.textContent = 'SCORE DETAILS';
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

  /**
   * add the score breakdown to a card
   * @param {String} filename - name of the file the product was returned from. used
   *                       to cycle through correct details
   * @param {String} itemId - full SKU_ProductID of the item whose details we need
   * @param {HTMLElement} card - the card the details are being added to
   * @returns 
   */
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

  /**
   * indent the score breakdown items according to the nesting level
   */
  function scoreIndent() {
    for (let i = 1; i < 10; i++) {
      let desc = qsa(`.indent-${i}`);
      for (let k = 0; k < desc.length; k++) {
        let indent = (i-1) * 8;
        desc[k].style.marginLeft = `${indent}px`;
        desc[k].style.maxWidth = `${desc[k].style.maxWidth - indent}%`;
      }
    }

    // add class to card for each boost? check as we go

  }

  /**
   * builds sidebar dropdown to allow user to select which files (searches) to
   * display returned product cards for.
   */
  async function search() {
    try {
      let res = await fetch('/files');
      await statusCheck(res);
      let data = await res.json();

      let parent = qs("select");
      
      for (let i = 0; i < data.length; i++) {
        let name = data[i].split(".")[0];
        let option = gen("option");
        option.value = name;
        option.textContent = name;
        parent.appendChild(option);
      }

      let all = gen("option");
      all.value = "all";
      all.textContent = "all files";

      qsa("option")[0].selected = true;
      parent.appendChild(all);
      
    } catch (err) {
      console.error('get data: ' + err); 
    }
  }

  /**
   * hides non-selected search file contents.
   */
  function hideSections() {
    let selection = qs("select").value;
    let sections = qsa("#items > section");
    let filename = selection.split(" ").join("-");
    if (selection !== "all") {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].id !== filename) {
          sections[i].classList.add('hidden');
        } else {
          sections[i].classList.remove('hidden');
        }
      }
    } else {
      for (let i = 0; i < sections.length; i++) {
        sections[i].classList.remove('hidden');
      };
    }
  }

  /**
   * based upon the selected file to show contents for, changes the title of the
   * sidebar.
   */
  function sidebarTitle() {
    let selection = qs("select").value;
    qs("#results-desc > h1").textContent = selection;
  }

  // dynamically add checkboxes to sidebar to filter cards by boost
  function sidebarOptions() {
    // dynamically add checkboxes to a sidebar to filter the cards
    // by the boosts added to them

    // qsa for all checkboxes
    // loop over to check that none of their ids/text match the val description
    // if no match, add to list as a check to exclude all other cards
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

  /**
   * reads the cleaned details data from files in order to build the card
   * dropdowns.
   * @param {String} filename 
   * @returns 
   */
  async function readDetails(filename) {
    try {
      let res = await fetch('/clean/details/' + filename);
      await statusCheck(res);
      let data = await res.json();
      return data;
    } catch (err) {
      console.error('get data: ' + err); 
    }
  }

  /* ----- Helpers & wrappers ----- */

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