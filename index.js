const express = require('express')
const port = 80
const axios = require('axios')
const cheerio = require('cheerio')
const siteUrl = 'https://www.worldometers.info/coronavirus/country/india/'
const fs = require('fs')
const ejs = require('ejs')
const cron = require('node-cron')
const http = require('http')
const moment = require('moment-timezone')

const appUrl = "http://covid-india-69.herokuapp.com"
const apiUrl = "https://api.data.gov.in/resource/cd08e47b-bd70-4efb-8ebc-589344934531?format=viz&limit=all&api-key=579b464db66ec23bdd000001cdc3b564546246a772a26393094f5645&_=1586501432931"
const rankUrl = "https://www.worldometers.info/coronavirus/countries-where-coronavirus-has-spread/"

const server = express()
server.listen(port, () => {
	console.log(`listening on ${port}`)
})


//Kernal Functions
const currentTime = () => { return moment().tz("Asia/Kolkata").format('MMMM Do YYYY, h:mm:ss a') }

const updateState = async (url) => {
	let stateData = await axios.get(url)
	let coreData = JSON.parse(fs.readFileSync('./core.json'))
	stateData = stateData.data.data
	stateData.sort((a,b) => (a[2]-b[2])*-1) //sort

	coreData.states = stateData
	fs.writeFileSync('./core.json',JSON.stringify(coreData),'utf-8')//statesSave
}


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
	coreData.lastUpdate = currentTime() //timeUpdate

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

const updateRank = async (url) => {
	let html = await axios.get(url)
	let $ = cheerio.load(html.data)

	let rank = $('tr:contains("India")').index()
	rank = Number(rank)+1

	let coreData = JSON.parse(fs.readFileSync('./core.json'))
	coreData.rank = rank

	fs.writeFileSync('./core.json',JSON.stringify(coreData),'utf-8')

}


//Scheduled Cron Jobs

cron.schedule("0 0 */1 * * *", () => {
	update(siteUrl)		//core update
	updateRank(rankUrl) //rank update
	console.log('hourly updated cachce at ' + currentTime())
})

cron.schedule("0 30 18 * * *", () => {
	console.log('midnight m812 update. States and Day Count Updated.' + currentTime())
	let coreData = JSON.parse(fs.readFileSync('./core.json'))
	coreData.lastDay = coreData.total; //reseting last day to end Day count
	fs.writeFileSync('./core.json',JSON.stringify(coreData),'utf-8')

	updateState(apiUrl) //statesUpdate
})

update(siteUrl)

///. basic static serve.
server.use(express.static('public'))

/*

1. fetch and save on hardisk (every hour)
2. static serve (index.htm,custom.css)

//aright bois. we got a Old Ubuntu Linux 8gb SSD Laptop with 24/7 power and network.
*/


