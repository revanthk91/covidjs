const express = require('express')
const port = 5000
const axios = require('axios')
const cheerio = require('cheerio')
const siteUrl = 'https://www.worldometers.info/coronavirus/country/india/'
const fs = require('fs')
const ejs = require('ejs')
const cron = require('node-cron')

const server = express()
server.listen(port, () => {
	console.log(`listening on ${port}`)
})


//Kernal Functions
const update = async (url) => {
	//collection
	const html = await axios.get(url)
	const $ =  cheerio.load(html.data)
	var text = $('.maincounter-number').text()
	var list = text.split('\n')

	var data = list.filter( x => x !='')

	//comma proccesser
	var data = commaProcess(data)

	cachePage(data)
}


const cachePage = (newData) => {
	var template = fs.readFileSync('./template.ejs','utf-8')

	var coreData = JSON.parse(fs.readFileSync('./core.json'))
	coreData.total = newData
	coreData.lastUpdate = new Date() //timeUpdate

	fs.writeFileSync("./core.json",JSON.stringify(coreData),'utf-8') //coreUpdate 

	var newHtml = ejs.render(template,coreData)
	fs.writeFileSync("./public/index.html",newHtml,'utf-8') //staticUpdate
}


const commaProcess = (stringNums) => {

	let array = stringNums.map(x => {
		let bits = x.split(',')
		let num = ''
		bits.forEach(a => {
			num = num+ a
		})
		num = parseInt(num)
		return num
	})
	return array
}


//Scheduled Cron Jobs

cron.schedule("0 0 */1 * * *", () => {
	update(siteUrl)
	console.log('hourly updated cachce at ' + new Date())
})

cron.schedule("0 59 23 * * *", () => {
	let coreData = JSON.parse(fs.readFileSync('./core.json'))
	coreData.lastDay = coreData.total; //reseting last day to end Day count
	fs.writeFileSync('./core.json',JSON.stringify(coreData),'utf-8')
})

//Keep Heroku Site Alive( kinda a dick move)
setInterval(() => {
  axios.get(appUrl);
}, 5 * 60  * 1000); // every 5 minutes



///. basic static serve.
server.use(express.static('public'))


/*

1. fetch and save on hardisk (every hour)
2. static serve (index.htm,custom.css)
*/


