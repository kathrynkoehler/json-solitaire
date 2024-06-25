/**
 * decompose the json files into more accessible versions that are quicker
 * to read from
 */


'use strict';

(function () {

  

  // holds extracted details from json
  let allDetails = {};
  let allProducts = {};

  window.addEventListener('load', init);

  /**
   * initializes the program on page load. the refresh button is set to read the
   * contents of the json-files directory, parse it, and begin the process
   * of decomposing it.
   */
  function init() {
    
  }

 

  /**
   * reads the directory to get a list of all data files to parse.
   */
  async function getData() {
    try {
      let fileNames = await grabAllJson();
      for (let i = 0; i < fileNames.length; i++) {
        //console.log(fileNames[i]);
        await grabOneJson(fileNames[i]);
      }
      await writeProducts();
    } catch (err) {
      console.error('init ' + err);
    }
  }

  /**
   * retrieves the list of files within the json-files directory.
   * @returns array of file names within directory
   */
  async function grabAllJson() {
    try {
      let res = await fetch('/files');
      await statusCheck(res);
      let data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * grabs the product data for one JSON file. called from getData().
   * @param {String} filename - the file to read
   */
  async function grabOneJson(filename) {
    try {
      let res = await fetch(`/files/${filename}`);
      await statusCheck(res);
      let data = await res.json();

      
    } catch (err) {
      console.error(err);
    }
  }

  

  

  

  /**
   * Write product score details into a new file. This saves us fro having to
   * manually parse the original data on every page load. The score data is too
   * large to write and read the entire directory at once, so each file from the
   * original data directory has its own corresponding "clean" version written here.
   * @param {String} filename - the file whose data is being parsed.
   */
  async function writeDetails(filename) {
    try {
      let data = new FormData();
      data.append('file', filename);
      data.append('content', JSON.stringify(allDetails[filename]));
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

})();