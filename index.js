const events = [
    "Page.loadEventFired",
    "Page.domContentEventFired",
    "Page.frameStartedLoading",
    "Page.frameAttached",
    "Network.requestWillBeSent",
    "Network.requestServedFromCache",
    "Network.dataReceived",
    "Network.responseReceived",
    "Network.resourceChangedPriority",
    "Network.loadingFinished",
    "Network.loadingFailed",
  ];
  
  async function run(url_to_scan) {
    const { chromium } = require("playwright");
  
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
  
    const originalUserAgent = await (
      await (await browser.newContext()).newPage()
    ).evaluate(() => {
      return navigator.userAgent;
    });
  
    const browserContext = await browser.newContext({
      userAgent: originalUserAgent.replace("Headless", ""),
    });
  
    const page = await browserContext.newPage();
    const client = await page.context().newCDPSession(page);
  
    //   // Create headless session
    //   const browser = await puppeteer.launch();
    //   const page = await browser.newPage();
  
    // Enable events listeners
    //   const client = await page.target().createCDPSession();
    await client.send("Page.enable");
    await client.send("Network.enable");
    await client.send("Network.setCacheDisabled", {
      cacheDisabled: true,
    });
  
    //   await page.setCacheEnabled(false);
  
    let nbRequest = 0;
    let contentLength = 0;
    let encodedDataLength = 0;
    let dataLength = 0;
  
    // Log network traffic and page domain notifications
    events.forEach((eventName) => {
      client.on(eventName, async (listenerFunc) => {
        // console.log(eventName, listenerFunc, "\n");
        if (eventName == "Network.dataReceived") {
          dataLength += parseInt(listenerFunc.dataLength);
        }
        if (eventName == "Network.responseReceived") {
          if (!listenerFunc.response.url.startsWith("data:")) {
            console.log(listenerFunc.response.url);
            nbRequest++;
            if (
              typeof listenerFunc.response.headers["Content-Length"] !==
              "undefined"
            ) {
              contentLength += parseInt(
                listenerFunc.response.headers["Content-Length"]
              );
              // console.log(
              //   listenerFunc.response.url,
              //   parseInt(listenerFunc.response.headers["Content-Length"])
              // );
            } else {
              // console.log(listenerFunc.response.url, 0);
            }
          }
        }
        if (eventName == "Network.loadingFinished") {
          if (typeof listenerFunc.encodedDataLength !== "undefined")
            encodedDataLength += parseInt(listenerFunc.encodedDataLength);
        }
      });
    });
  
    // Do not work for "www.forbes.com", but works well for "www.kernel.org"!
    await page.goto(
      url_to_scan
      //      {
      //     waitUntil: ["networkidle2"],
      //     // timeout: 10000,
      //   }
    );
  
    await page.waitForLoadState("networkidle");
  
    //console.log('DIE'); process.exit();
    await browser.close();
  
    // Display metrics
    //   console.log("Number of requests: " + nbRequest);
    //   console.log("Sum of content-length headers: " + convertKoMo(contentLength));
    //   console.log("Data transfered: " + convertKoMo(encodedDataLength));
    //   console.log("Page size: " + convertKoMo(dataLength));
  
    return {
      total_requests: nbRequest,
      page_size: dataLength,
      content_length: contentLength,
      encoded_data_length: encodedDataLength,
    };
  }
  
  const express = require("express");
  const app = express();
  
  const errorHandler = (error, request, response, next) => {
    // Error handling middleware functionality
    console.log(`error ${error.message}`); // log the error
  
    const status = error.status || 400;
  
    // send back an easily understandable error message to the caller
    response.status(status).send(error.message);
  };
  
  app.get("/calculate", async (req, res, next) => {
    let url_to_scan = req.query.url;
    try {
      let result = await run(url_to_scan);
      console.log(result);
      res.end(JSON.stringify(result));
    } catch (err) {
      next(err);
    }
  });
  
  app.use(errorHandler);
  
  // Start the server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
  });
  