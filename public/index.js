/**
 * Responsible for building interface. 
 * Reads in data that has already been "cleaned" by decompose.js, then parses 
 * it out into "cards" to display to the user on load.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  // holds current jwt
  let jwt;

  // api constants
  const API_URL = 'https://lululemon-dev.c.lucidworks.cloud';
  const APPID = 'LLM_us';

  // holds extracted product information from cleaned json files
  let allProducts = {};
  let allDetails = {};

  /**
   * initializes the page upon load. 
   */
  async function init() {
    try {
      qs('#auth form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await authenticateJWT(e);
      });
      // prep searchbar to query api
      id('search-form').addEventListener('submit', async (e) => {
        e.preventDefault();     // possibly remove, might want page reload?
        await loadPage(e);
      });
    } catch (err) {
      console.error('init ' + err);
    }
  }

  async function authenticateJWT() {
    try {
      let user = qs('#auth form')['username'].value;
      let password = qs('#auth form')['password'].value;
      await refreshJwt(API_URL, user, password);
    } catch (err) {
      console.error(err);
    }
  }

  // refreshes current jwt, obtaining new from fusion rest api and schedules
  // method to run again before jwt expires
  async function refreshJwt(apiUrl, user, password) {
    const loginUrl = `${apiUrl}/oauth2/token`;
    const auth = btoa(`${user}:${password}`);
    const authHeader = `Basic ${auth}`;

    // execute httppost to get jwt
    console.log(`Obtaining new JWT via ${loginUrl}`);
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      await statusCheck(response);

      const responseJSON = await response.json();
      console.log(responseJSON);
      jwt = responseJSON['access_token'];
      const secondsUntilExpiration = parseInt(responseJSON['expires_in']);

      // reschedule before it expires
      const graceSeconds = secondsUntilExpiration > 15 ? 10 : 2;
      const secondsUntilRefresh = secondsUntilExpiration - graceSeconds;
      console.log(`Successfully refreshed JWT, refreshing again in ${secondsUntilRefresh} seconds`);

      setTimeout(async () => {
        await refreshJwt(apiUrl, user, password);
      }, secondsUntilRefresh * 1000);
    } catch (e) {
      console.error('Attempt to retrieve JWT token failed due to exception. Exiting...', e);
    }
  }

  /**
   * retrieves cleaned product data to build interface and handle interactivity. 
   */
  async function loadPage(e) {
    try {
      // loading animations
      let items = id('items');
      let circle = qs('#options svg');
      let circle2 = id('load-circle');
      items.innerHTML = '';
      circle.classList.remove('hidden');
      circle2.classList.remove('hidden');

      // query data from api, then display on page
      await queryData(e);
      await displayData();
      
      // when all data is displayed, remove loading icons
      circle.classList.add('hidden');
      circle2.classList.add('hidden');
      qs(`#items .loading`).classList.add('hidden');
    } catch (err) {
      console.error(err);
    }
  }

  /*
    ************** decompose response from api **************
  */

  /**
   * queries data directly from api.
   */
  async function queryData(e) {
    e.preventDefault();
    try {
      // authenticate current jwt by adding it in auth header
      const headers = {
        'Authorization': `Bearer ${jwt}`
      };

      // get the search string, query api
      let search = id('searchbar').value;
      search = search.split(' ').join('%20');
      const queryURL = `/api/apps/${APPID}/query/${APPID}?q=${search}&debug=results&debug.explain.structured=true`;
      
      let res = await fetch(API_URL + queryURL, { headers });
      await statusCheck(res);
      res = await res.json();         // this is the new "dirty" data to parse
      console.log(res);

      // decompose products list & scores, write to allProducts and allDetails
      // search = search.split(" ").join("-");
      // search = search.split(".")[0];
      decomposeSKU(res);
    } catch (err) {
      console.error('queryData: ' + err);
    }
  }

  /**
   * Decomposes the JSON from the original data, extracting useful fields
   * to save for each listed product. Also extracts score details and saves
   * those breakdowns.
   * @param {Object} data - the JSON data to parse
   */
  function decomposeSKU(data) {
    const skus = data["debug"]["explain"];
    let item;
    let value;
    allProducts = {};
    allDetails = {};

    for (item in skus) {
      let prodId = item.split('_').slice(1)[0];
      let skuId = item.split('_')[0];
      value = skus[item].value;

      // check if product id already has an object
      let array = setData(data, prodId, skuId);

      // if (!array) {
      //   console.log("no array");
      // }

      // console.log(typeof(array));
      // // console.log(skuId);
      // let displayName = array[0];
      // let size = array[1];
      // let img = array[2];
      // let price = array[3];
      // let skuimg = array[4];
      // console.log(displayName, size, img, skuimg, price);

      if (!allProducts[prodId]) {
        allProducts[prodId] = {
          'productId': prodId,
          'displayName' : array[0],
          'size': array[1],    // when image removed, change to [1]
          'prodImg': array[2],
          'skus': {}
        }
      }
      // console.log((array[2]).toString());
      allProducts[prodId]['skus'][skuId] = {
        'skuScore': value, 
        'skuImg': array[3],
        'price': array[4],
        'color': array[5],
      };
      
      // extract details for every sku_prodid item
      let depth = 0;
      allDetails[item] = [];
      let newObj = traverseDetails(depth, item, (skus[item]));
    }
  }

  /**
   * Grabs the image and displayName from "response" "docs" object in the file.
   * Saves these as an array that will later be saved in the "cleaned" data object.
   * @param {Object} data - the JSON to parse
   * @param {String} productId - the product whose image and name we are retrieving
   * @returns array of displayname + image for each product
   */
  function setData(data, productId, skuId) {
    let docs = data["response"]["docs"];
    
    // for each product, find details list
    let item;
    for (item in docs) {
      // console.log(docs[item]["product_id"]);
      // console.log(productId);
      if (docs[item]["product_id"] === productId) { //&& docs[item]["sku_id"] === skuId
        let array = [docs[item]["product_displayName"],   // object[0]
            docs[item]["sku_size"],                       // object[1]
            docs[item]["sku_skuImages"][0],               // object[2] (prod img)
            // docs[item]["list_price"]
          ];                    // object[3]

        let skuslist = docs[item]["style_order_list"];

        for (let i = 0; i < skuslist.length; i++) {
          // console.log(i);
          // console.log(skuslist[i]["sku_id"]);
          // console.log(skuId);
          if (skuslist[i]["sku_id"] === skuId) {
            // console.log(skuslist[i]);

            let colors = [skuslist[i]["sku_colorGroup"], 
              skuslist[i]["sku_colorCodeDesc"]];

            array.push(
              skuslist[i]["sku_skuImages"][0],    // object[3]
              skuslist[i]["list_price"],          // object[4]
              colors                              // object[5]
            );
            return array;
          }
        }
        return array;
      }
    }
  }

  /**
   * Recursive function traverses the nested JSON object containing the score
   * breakdown for each item. The score value and description are saved into an
   * array, along with the depth of that score in the nested JSON object. 
   * @param {Number} depth - the current depth of the nested object
   * @param {String} search - the search data being parsed (TODO: remove)
   * @param {String} prodId - the ID of the product's score being parsed
   * @param {Object} item - the JSON object being traversed
   * @returns the array of score depth + description + value for each nested object
   */
  function traverseDetails(depth, prodId, item) {
    
    // for each field in json, check if it's 'details'
    let object = [];
    Object.keys(item).forEach(key => {

      // if details, pull out the score and description
      if (typeof item[key] === 'object' && item[key] !== null && key === "details") {
        
        // pull out all scores at that depth
        let short = item["details"];
        for (let i = 0; i < short.length; i++) {
          allDetails[prodId].push([depth+1, short[i]["description"], short[i]["value"]]);
          
          // then check for more details
          traverseDetails(depth+1, prodId, short[i]);
        }

        // when finished with one obj, do the other nested ones too
        traverseDetails(depth, prodId, item["details"]);
      } else {
        return object;
      }
    });
  }

  /*
    ************** create interface from data **************
  */

  /**
   * displays the data retrieved from the api. called when queryData() completes
   */
  async function displayData() {
    try {
      // build card decks, change title to match query
      console.log(allProducts);
      await buildInterface();
      // sidebarTitle();

      // enable filtering on boosts
      id('filter-btn').addEventListener('click', filterCards);
      id('unfilter-btn').addEventListener('click', unfilterCards);
    } catch (err) {
      console.error('displayData ' + err);
    }
  }

  /**
   * adds all cards to page, separated by search file. 
   */
  async function buildInterface() {
    try {

      let search = id('searchbar').value;
      search = search.split(" ").join("-");
      qs('#scores').innerHTML = '';
      qs('#checklist').innerHTML = '';

      // build section within #items to contain decks
      addHeader(search);

      // for each product in file, create card stack with displayname, score, skus
      let product;
      for (product in allProducts) {
        let item = allProducts[product];
        addProductSection(item, search);

        // for each sku in product, create card with image, score
        let sku;
        let count = Object.keys(item['skus']).length;
        for (sku in item['skus']) {
          // console.log(allProducts[file][product]['productId']);
          // console.log(allProducts[file][product]['skus'][sku]);
          console.log(item);
          await addCard(item,                 // data
            item['skus'][sku]['skuScore'],    // value
            item['skus'][sku],                // skudata
            sku,                              // sku
            search,                           // section
            count--);                         // number
        }

        // create the title card for the front of the stack
        addProductCard(item['skus'],    // data
          product,                      // prodid
          item,                         // displayname
          item['prodImg'],              // image
          search);                      // section
      }
      sidebarTitle();
      scoreIndent();
    } catch (err) {
      console.error('buildInterface ' + err);
    }
  }

/**
 * add new section within #items for search query
 * @param {String} search - the query string
 */
  function addHeader(search) {
    try {
      let section = gen('section');
      
      section.id = search;

      let load = gen('div');
      load.classList.add('load-items');
      load.classList.add('loading');
      section.appendChild(load);

      let parent = document.getElementById("items");
      parent.appendChild(section);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * put each product in its own deck within the file card list
   * @param {Object} product - JSON object of product details
   * @param {String} search - the search the item was returned from. used to
   *                  place the section on the page
   */
  function addProductSection(product, search) {
    try {
      let section = gen('section');
      section.classList.add(product['productId']);
      section.classList.add('product-container');
      
      // spacers that isolate the deck when spread
      let spacer1 = gen('div');
      // spacer1.classList.add('hidden');
      let spacer2 = gen('div');
      // spacer2.classList.add('hidden');
      
      let parent = document.getElementById(`${search}`);
      parent.appendChild(section);
      section.insertAdjacentElement('beforebegin', spacer1);
      section.insertAdjacentElement('afterend', spacer2);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * add title product card to card stack
   * @param {Object} data - JSON object of product data
   * @param {String} productId - ID of product
   * @param {String} displayName - Display name of product
   * @param {String} search - query the item was returned from
   */
  function addProductCard(data, productId, displayName, image, search) {
    try {
      // add product photo
      const photoDiv = gen('div');
      photoDiv.classList.add('photo');
      const photo = gen('img');
      photo.src = image;
      photo.alt = displayName;
      photoDiv.appendChild(photo);
      // console.log(data[0]);

      // add aggregate scores from skus
      let scores = productScores(data);
      
      const title = gen('h1');
      title.textContent = displayName['displayName'];
      title.classList.add("card-search");
      // const title = gen('h1');
      // title.textContent = displayName['displayName'];
      const prodId = gen('h2');
      prodId.textContent = 'ID: ' + productId;
      // const average = gen('h2');
      // average.textContent = 'Score average: ' + scores[1];
      const max = gen('h2');
      max.textContent = 'Score maximum: ' + scores[1];
      // const min = gen('h2');
      // min.textContent = 'Score minimum: ' + scores[3];
      const count = gen('h2');
      count.textContent = 'SKU count: ' + scores[0];

      const contents = gen('div');
      contents.classList.add('card-contents');
      contents.appendChild(title);
      // contents.appendChild(title);
      contents.appendChild(prodId);
      // contents.appendChild(average);
      contents.appendChild(max);
      // contents.appendChild(min);
      contents.appendChild(count);

      const article = gen('article');
      article.classList.add('product-card');
      article.classList.add('title-card');
      article.appendChild(photoDiv);
      article.appendChild(contents);

      // const parent = document.getElementById(`${search}`);
      const prodContainer = qs(`#${search} .${productId}`);
      prodContainer.prepend(article);

      article.addEventListener('click', (e) => {
        spreadDeck(e);
      });
    } catch (err) {
      console.error(err);
    }
    
  }

  /**
   * compiles data about a product's skus' scores.
   * @param {Object} product 
   * @returns Array of numbers for various calculated aggregates
   */
  function productScores(product) {
    let count = 0;
    // let total = 0;
    let max = 0;
    // let min = 5000000000;

    let sku;
    for (sku in product) {
      let current = parseFloat(product[sku]['skuScore']);
      // total += current;
      count ++;
      if (current > max) max = current;
      // if (current < min) min = current;
    }
    // let average = total / count;
    return [count, max];
  }

  /**
   * build and add SKU card to page.
   * @param {Object} data - JSON object containing data about the item
   * @param {Number} value - total score of SKU
   * @param {Array} skuData - details object for SKU, used to retrieve image
   * @param {String} sku - the SKUId of the item
   * @param {String} search - the query the product was returned from. used to 
   *                  place the card on the page
   */
  async function addCard(data, value, skuData, sku, search, number) {
    try {
      // the card that we'll assemble below
      const card = gen('article');
      card.classList.add('product-card');

      // const parent = document.getElementById(`${search}`);
      const prodContainer = qs(`#${search} .${data['productId']}`);
      console.log(`#${search} .${data['productId']}`);
      prodContainer.prepend(card);
      // parent.appendChild(prodContainer);
      const productID = sku + '_' + data['productId'];

      // add photo
      const photoDiv = gen('div');
      photoDiv.classList.add('photo');
      const photo = gen('img');
      photo.src = skuData['skuImg'];
      // console.log(skuData);
      photo.alt = data['displayName'];
      photoDiv.appendChild(photo);
      // console.log(photoDiv);
      
      // add title, productID, SKUID, overall score
      const title = gen('h1');
      title.textContent = data['displayName'];
      const prodId = gen('h2');
      prodId.textContent = 'ID: ' + productID;
      const order = gen('p');
      order.textContent = number;
      const score = gen('h2');
      score.textContent = 'Score: ' + value;

      // score dropdown
      const dropDownButton = gen('button');
      dropDownButton.textContent = 'SCORE DETAILS';
      dropDownButton.classList.add('collapsible');
      const dropDownContainer = await scoreList(search, 
        productID, card);

      dropDownButton.addEventListener('click', () => {
        dropDownButton.classList.toggle('active');
        let content = dropDownButton.nextElementSibling;
        content.classList.toggle('hidden');
        sidebarScores(dropDownContainer, productID);
        let sidebarDropDown = id(`#${productID}-scorelist`);
        if (sidebarDropDown) {
          sidebarDropDown.classList.toggle('hidden');
        }
      });

      const contents = gen('div');
      contents.classList.add('card-contents');
      contents.append(title, prodId, order, score, dropDownButton, dropDownContainer);

      card.appendChild(photoDiv);
      card.appendChild(contents);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * adds the score breakdown to a card. called from addCard()
   * @param {String} search - the query the product was returned from.
   *          used to cycle through correct details
   * @param {String} itemId - full SKU_ProductID of the item whose details we need
   * @param {HTMLElement} card - the card the details are being added to. passed
   *          in so the boost classes can be applied
   * @returns completed container element for score dropdown
   */
  async function scoreList(search, itemId, card) {
    const dropDownContainer = gen('article');
    dropDownContainer.classList.add('content');
    dropDownContainer.classList.add('hidden');
    dropDownContainer.id = itemId + '-scorelist';
    
    // let file = await readDetails(search);
    // let file = allDetails[search];

    // for each product in search results, check if it's the item we need
    let item;
    for (item in allDetails) {
      if (item === itemId) {

        // for each score in item, add to item dropdown
        let score;
        for (score in allDetails[item]) {
          const div = gen('div');

          const description = gen('p');
          let descContent = allDetails[itemId][score][1];
          description.textContent = descContent;
          description.classList.add("detail-desc");

          let indent = "indent-" + allDetails[itemId][score][0];
          description.classList.add(indent);

          const value = gen('p');
          let valContent = allDetails[itemId][score][2];
          value.textContent = valContent;
          value.classList.add("detail-val");

          div.appendChild(description);
          div.appendChild(value);
          dropDownContainer.appendChild(div);

          // check which boosts are applied & add class to card for filtering
          if (descContent === "boost") {
            let context = (div.previousElementSibling).previousElementSibling;
            // console.log(context);
            let name = context.childNodes[0].textContent;
            name = (name.split(' ')[0]).split(':')[1];
            // console.log(name);
            card.classList.add(`${name}-boost-${valContent}`);
            const parent = card.parentElement;
            // add hide-boost to entire product stack when filtered
            parent.classList.add(`${name}-boost-${valContent}`);
            sidebarOption(`${name}-boost-${valContent}`);
            div.classList.add('scoreboost');
          }
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
        const style = window.getComputedStyle(desc[k]);
        const width = style.getPropertyValue("max-width");
        desc[k].style.width = `${width - indent}%`;
      }
    }
  }

  /**
   * when a deck is clicked on, spreads the associated SKU cards beneath title
   * card out onto the page. 
   * @param {Event} e - click event triggering function call. allows function to 
   *                identify the clicked product title card.
   */
  function spreadDeck(e) {
    // let card = e.currentTarget;
    let section = e.currentTarget.parentElement;

    // only allow one deck to be spread at a time. remove spacer elements
    let spread = qs('.product-container.spread');
    if (spread) {
      spread.previousSibling.classList.remove('spread');
      // spread.previousSibling.classList.add('hidden');
      spread.nextSibling.classList.remove('spread')
      // section.nextSibling.classList.add('hidden');
      spread.classList.remove('spread');
      if (spread === section) {
        return;
      }
    }

    // spread the new deck
    section.classList.add('spread');
    // section.previousSibling.classList.remove('hidden');
    section.previousSibling.classList.add('spread');
    // section.nextSibling.classList.remove('hidden');
    section.nextSibling.classList.add('spread')
    
    // make sure the page view follows the new element location
    section.scrollIntoView({behavior: 'smooth', block: 'center'});
  }

  /**
   * based upon the selected file to show contents for, changes the title of the
   * sidebar.
   */
  function sidebarTitle() {
    let search = id('searchbar').value;
    qs("#results-desc > h1").textContent = search;

    // show how many products are returned
    search = search.split(' ').join('-');
    let count = qsa(`#${search} > section`).length;
    let span = qs('#results-desc span');
    span.textContent = count;
  }

  /**
   * add selected card's score breakdown to sidebar list.
   * @param {Element} scorelist - the container holding the score breakdown for
   *                  the selected card.
   * @param {String} title - the product the scores correspond to
   */
  function sidebarScores(scorelist, title) {
    let sidebar = id('scores');

    let container = gen('div');
    let heading = gen('h2');

    let label = gen('span');
    label.textContent = title;
    label.classList.add('category');
    let icon = gen('img');
    icon.src = './img/x.png';

    heading.appendChild(label);
    heading.appendChild(icon);
    heading.addEventListener('click', () => {
      // heading.classList.toggle('active');
      let content = heading.nextElementSibling;
      content.classList.toggle('hidden');
    });
    icon.addEventListener('click', () => {
      // (icon.parentNode).parentNode.remove();
      (icon.parentNode).parentNode.classList.toggle('hidden');
    });

    container.appendChild(heading);
    container.appendChild(scorelist);

    sidebar.appendChild(container);
  }

  // build expandable icon svg for score list on sidebar
  function scoreSvg() {
    let expand = gen('div');
    let svg1 = gen('img');
    let svg2 = gen('img');
    svg1.src = './img/minus.png';
    svg2.src = './img/minus.png';
    svg1.classList.add('expandIcon');
    svg2.classList.add('expandIcon');

    expand.append(svg1, svg2);
    expand.classList.add('expandedToggle');
    expand.addEventListener('click', () => {
      expand.classList.toggle('expandedToggle');
      expand.classList.toggle('expandToggle');
    });

    // console.log(expand);
    return expand;
  }

  function buildSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', "0 0 24 24");
    svg.setAttribute('height', "24");
    svg.setAttribute('width', "24");
    svg.classList.add('expandIcon');

    let path = gen('path');
    path.setAttribute('d', "M21.39 12.75a1 1 0 0 0 1-1v-.5h-19a1 1 0 0 0-1 1v.5Z");
    path.setAttribute('stroke', "red");
    console.log(path);

    svg.appendChild(path);
    return svg;
  }

  /**
   * dynamically add checkboxes to sidebar to filter cards by boost applied
   * @param {String} boost - the boost to be filtered on
   */
  function sidebarOption(boost) {
    // check that boost is not already on list
    if (id(`check-${boost}`)) {
      return;
    }

    let div = gen('div');

    let input = gen('input');
    input.type = 'checkbox';
    input.id = `check-${boost}`;

    boost = boost.split("-");
    boost[0] = boost[0] + ':';
    boost = boost.join(" ");

    let label = gen('label');
    label.for = input.id;
    label.textContent = boost;

    div.appendChild(input);
    div.appendChild(label);

    const parent = id("checklist");
    parent.appendChild(div);

    const style = window.getComputedStyle(parent);
    qs('#options svg').style.height = style.getPropertyValue('height');
  }

  /**
   * filters the displayed cards based on the boost applied to them.
   */
  function filterCards() {
    let type = qs('input[type=radio]:checked').id;
    let filters = qsa('#filter input[type=checkbox]:checked');
    
    if (type === "exclude") {   
      // for each selected boost
      for (let i = 0; i < filters.length; i++) {
        let boost = (filters[i].id).split('-').slice(1).join('-');
        // exclude only cards with that boost
        let cards = qsa(`.${boost}`);
        for (let i = 0; i < cards.length; i++) {
          cards[i].classList.add('hide-boost');
        }
      }
      
    } else {    
      // for each selected boost           
      for (let i = 0; i < filters.length; i++) {
        let boost = (filters[i].id).split('-').slice(1).join('-');
        // exclude cards WITHOUT the boost
        let cards = qsa(`.product-container:not(.${boost}`); // :not(.title-card)
        for (let i = 0; i < cards.length; i++) {
          cards[i].classList.add('hide-boost');
        }
        // and make sure cards WITH the boost are included
        cards = qsa(`.${boost}`);
        for (let i = 0; i < cards.length; i++) {
          cards[i].classList.remove('hide-boost');
        }
      }
    }
  }

  /**
   * clears all applied filters.
   */
  function unfilterCards() {
    let type = qs('input[type=radio]:checked');
    type.checked = false;

    let filters = qsa('#filter input[type=checkbox]:checked');
    for (let i = 0; i < filters.length; i++) {
      filters[i].checked = false;
    }

    let filter = qsa(`.hide-boost`);
    for (let i = 0; i < filter.length; i++) {
      filter[i].classList.remove('hide-boost');
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