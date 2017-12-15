var request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    config = require('./config');

var page = config.page,
    maxPage = config.maxPage,
    showContents = config.showContents,
    outputType = config.outputType;

var url = "https://www.prnewswire.com/news-releases/consumer-technology-latest-news/consumer-electronics-list/?page=" + page + "&pagesize=100";

function getArticle() {
    console.log("### page no." + page + " ###");
    
    request(url, function (err, res, html) {
        if (err) return console.error(err);

        var $ = cheerio.load(html);
        
        console.log("### crawling ###");
        console.log("### start phase 1 ###");

        var posts = new Array();
        var isDone = false;
    
        var j = 0;
        // crawl title and link
        console.log("### article list ###");
        $("div.col-sm-8.card-list a.news-release").each(function () {
            var post = {"title": "", "link": "", "date": "", "provider": "", "body": ""};
            var data = $(this);
    
            var link = data.attr("href");
            if (link.startsWith("//"))
                link = "https:" + data.attr("href");
            post["link"] = link;
            posts[j] = post;

            if (showContents)
                console.log(post["link"]);
        
            j++;
            if (j === 100)
                isDone = true;
        });
    
        while (true) {
            if (isDone)
                break;
        }
    
        // write csv header
        if (outputType === 1 && page === 1)
            fs.appendFile('news.csv', 'title,date,provider,body\n', 'utf-8', function (err) {
                if (err) throw err;
                console.log("### saved header ###");
            });
        
        console.log("### the number of list: " + j + " ###");
        console.log("### start phase 2 ###");
        function getContents(p) {
            request(posts[p]["link"], function (err, res, html) {
                if (err) return console.error(err);
            
                var $2 = cheerio.load(html);
            
                // header
                // console.log("### article header ###");
                $2("header.container.release-header").each(function () {
                    var data = $2(this);
            
                    var post = posts[p];
                    post["title"] = data.find("h1").text().trim().replace(/\r\n|\n|\r|\t/g,"").replace("\"","\\\"");
                    post["date"] = data.find("p.mb-no").text().trim().replace(/\r\n|\n|\r|\t/g,"");
                    post["provider"] = data.find("strong").text().trim().replace(/\r\n|\n|\r|\t/g,"");
                    if (showContents) {
                        console.log(post["title"]);
                        console.log(post["date"]);
                        console.log(post["provider"]);
                    }
                    posts[p] = post;
                });
       
                // body
                // console.log("### article body ###");
                $2("section.release-body.container.no-margin-bottom p").each(function () {
                    var data = $2(this);
            
                    var post = posts[p];
                    post["body"] += data.text().trim().replace(/\r\n|\n|\r|\t/g,"").replace("\"","\\\"");
                    posts[p] = post;
                });
    
                if (posts[p]["body"] === "") {
                    $2("section.release-body.container p").each(function () {
                        var data = $2(this);
                
                        var post = posts[p];
                        post["body"] += data.text().trim().replace(/\r\n|\n|\r|\t/g,"").replace("\"","\\\"");
                        posts[p] = post;
                    });
                }
                if (showContents)
                    console.log(posts[p]["body"]);
    
                if (outputType === 0) {
                    // write json
                    fs.appendFile('news.json',  JSON.stringify(posts[p]) + ',\n', 'utf-8', function (err) {
                        if (err) throw err;
                        console.log("### crawled and saved article no." + ((page-1)*100 +  p + 1) + " ###");

                        // callback
                        if (res.statusCode === 200) {
                            if (p < j - 1) {
                                p = p + 1;
                                getContents(p);
                            } else {
                                console.log("### end page " + page + " ###");
                                if (page <  maxPage) {
                                    page++;
                                    // callback
                                    getArticle();
                                };
                            }
                        }
                    });
                } else if (outputType === 1) {
                    // write csv
                    fs.appendFile('news.csv',  '"' + posts[p]["title"] + '","' + posts[p]["date"] + '","' + posts[p]["provider"] + '","' + posts[p]["body"] + '"\n', 'utf-8', function (err) {
                        if (err) throw err;
                        console.log("### crawled and saved article no." + ((page-1)*100 +  p + 1) + " ###");
        
                        // callback
                        if (res.statusCode === 200) {
                            if (p < j - 1) {
                                p = p + 1;
                                getContents(p);
                            } else {
                                console.log("### end page " + page + " ###");
                                if (page <  maxPage) {
                                    page++;
                                    // callback
                                    getArticle();
                                };
                            }
                        }
                    });
                } else {
                    // callback
                    console.log("### crawled article no." + ((page-1)*100 + p + 1) + " ###");
                    if (p < j - 1) {
                        p = p + 1;
                        getContents(p);
                    } else {
                        console.log("### end page " + page + " ###");
                        if (page <  maxPage) {
                            page++;
                            // callback
                            getArticle();
                        };
                    }
                }
            });
        }
        getContents(0);
    });
};
getArticle();