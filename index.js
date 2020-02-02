const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fse = require('fs-extra');
const path = require('path');
const utf8 = require('utf8');
const DomParser = require('dom-parser');
let totalItem = 0;

async function handle(postItem, index) {
    // save data here
    ++totalItem;

    // console.log("totalItem", totalItem)
    const $ = cheerio.load(postItem);
    await fse.outputFile(path.resolve(`./output/data/post/${new Date().getTime()}.html`), $.html());
    //TODO

}

const preHandle = text => text.replace("for (;;);", "");

const makeJson = (text) => JSON.parse(text);

const getHtml = json => {
    try {
        const dom = new DomParser();
        return dom.parseFromString(`<html lang="en"><body>${json["domops"][0][3]["__html"]}</body></html>`).getElementsByTagName('body')[0].innerHTML;
    } catch (e) {
        return "err";
    }
};

(async () => {
    const browser = await puppeteer.launch({
        // headless: false,
        // devtools: true,
        // defaultViewport: null
    });

    const incognito = await browser.createIncognitoBrowserContext();
    const page = await incognito.newPage();
    await page.goto('https://www.facebook.com/neuconfessions/');

    page.on('console', message => console.log("page log:", message));

    page.on('response', async (response) => {

        const request = response.request();
        if (request.resourceType() === 'xhr') {
            const text = await response.text();
            if (text.trim().length > 0) {
                const time = new Date().getTime();
                fse.outputFile(path.resolve(`./output/req/${time}.txt`), request.url()).then(ignored => {
                });
                fse.outputFile(path.resolve(`./output/res/${time}.json`), preHandle(text)).then(ignored => {
                });
                fse.outputFile(path.resolve(`./output/res/html/${time}.html`), getHtml(makeJson(preHandle(text)))).catch((ignored) => {
                });
            }
        }
    });

    for (let i = 0; i < 5; ++i) {
        console.log(i);
        const allPostItemSelector = "#pagelet_timeline_main_column #PagesProfileHomePrimaryColumnPagelet div[data-gt]";
        await page.waitForSelector(allPostItemSelector);

        const elements = [...await page.$$eval(allPostItemSelector, elements => elements.map(element => element.outerHTML))];
        elements.forEach(handle);

        await page.evaluate(allPostItemSelector => [...document.querySelectorAll(allPostItemSelector)].forEach(item => item.remove()), allPostItemSelector);
        const loadMoreItem = "#www_pages_reaction_see_more_unitwww_pages_home a[rel]";
        await page.waitForSelector(loadMoreItem);
        await page.click(loadMoreItem);
    }
    console.log("done. Total Item: ", totalItem);
    await browser.close();
})();
