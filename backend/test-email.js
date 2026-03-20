import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend('re_7tyGSKUF_6t2wYronSkve8ytB5Hq9EjWh');
// const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const emailsAsString =
	'lucindasmith7291@gmail.com,marcusrodriguez5042@gmail.com,felicitynguyen9015@gmail.com,donovanwilliams2876@gmail.com,cynthiawilson6329@gmail.com,elliotthughes4158@gmail.com,mackenzieparker92032@gmail.com,lincolnadams5634@gmail.com,isabellahall3816@gmail.com,gabrielcooper8973@gmail.com,paigebrown6148@gmail.com,zacharythompson2847@gmail.com,emilysanchez4791@gmail.com,owenrussell7921@gmail.com,carterbutler5682@gmail.com,averymartin4018@gmail.com,lilygonzalez8261@gmail.com,ethanmurphy9407@gmail.com,savannahturner6053@gmail.com,hudsonwright4196@gmail.com,nataliehill7281@gmail.com,jacobroberts58291@gmail.com,zoeycollins9087@gmail.com,dylanmorris2547@gmail.com,madelinecook6398@gmail.com,owenjackson7015@gmail.com,audreymorgan1285@gmail.com,noahwoodward9456@gmail.com,clairekelly3769@gmail.com,brooklynrogers2937@gmail.com,ronaldtaylor1265@mail.ru,lindadavis451@mail.ru,torben.russel@yandex.ru,karan.bell@yandex.ru,team-ed@m365.easydmarc.com,team-ed@m365.easydmarc.co.uk,team-ed@m365.easydmarc.nl,team-ed@m365.easydmarc.email,team-ed@m365.easydmarc.help,jonathan.shumacher@freenet.de,easydmarc@interia.pl,clarapearce16@aol.com,victoryoung939@aol.com,holmes_abel@aol.com,lucidodson585@aol.com,westemily343@aol.com,adalinemcintosh69@aol.com,leejack380@aol.com,ed-global@seznam.cz,ed-global2@seznam.cz,easydmarc@sfr.fr,hag@checkphishing.com,ed-global@workmail.easydmarc.com,ed-global2@workmail.easydmarc.com,amayathompson6274@gmx.com,finleyroberts9501@gmx.com,arianawalker3816@gmx.com,asherrussell7192@gmx.com,adrianawilson5031@gmx.com,lucahamilton2954@gmx.com,elliebutler6109@gmx.com,xaviercook1982@gmx.com,skylarhughes5287@gmx.com,oliverrodriguez8173@gmx.com,evelynedwards6947@gmx.com,elliotprice4138@gmx.com,saranichols8625@gmx.com,milesward2517@gmx.com,paigehoward2421@gmx.com,ziggybeltran@yahoo.com,myers.ridley@yahoo.com,aiylacortes@yahoo.com,miller.burton35@yahoo.com,sandy.allen7663@yahoo.com,burriscassidy156@yahoo.com,hillnancy886@yahoo.com,fitzpatrickedgar@yahoo.com,ed-global@op.pl,ed-global@onet.pl,team-ed@dmarc.am,team-ed@easydmarc.co.uk,team-ed@easydmarc.email,team-ed@easydmarc.help,team-ed@easydmarc.nl,norawoodard6719@zohomail.com,henrymartinez2864@zohomail.com,leohenderson1295@zohomail.com,jackcoleman2964@zohomail.com,harperroberts9350@zohomail.com,sydneypeterson9012@zohomail.com,evabennett2045@zohomail.com,julianramirez4758@zohomail.com,arielturner5704@zohomail.com,ivycollins6097@zohomail.com,ed-global@libero.it,vincentmarshall9240@outlook.com,sophiawright1707@outlook.com,nataliemorris4018@outlook.com,lucasrivera5629@outlook.com,camillemurray5964@outlook.com,alexandergreen31867@outlook.com,ameliawilson5167@outlook.com,isaacperry6239@outlook.com,zarahamilton3196@outlook.com,sebastiansanders4862@outlook.com,elisabethpowell7854@outlook.com,joshuarobinson1629@outlook.com,madisonharris4185@outlook.com,jonathanrodriguez7549@outlook.com,benjaminprice2195@outlook.com,lillianwoodard64191@outlook.com,elijahbailey39781@outlook.com,scarlettcoleman6237@outlook.com,victoriaroberts85075@outlook.com,ryangonzalez2164@outlook.com,easydmarc@laposte.net,hkhatchoian@icloud.com,ed-global@bluetiehome.com,ed-global@centrum.cz,easydmarc@free.fr,jonathan.shumacher@web.de,ed-global@att.net,jonathan.shumacher@t-online.de,jonathan.shumacher@gmx.de';

	const emailArray = emailsAsString.split(',').map((email) => email.trim());
	// console.log(emailArray);

	for (const email of emailArray) {
		try {
			const { data, error } = await resend.emails.send({
				from: 'Marketplace <noreply@gibli.eu>',
				to: email,
				subject: 'Good Morning',
				html: `
				
					<p style="font-size: 18px; line-height: 1.6; color: #333;">
						1KE3ADFBMGC
					</p>
					
					<p style="font-size: 16px; line-height: 1.6; color: #555;">
						Welcome to the email test. From Evans
						Thankyou for participating and have a great day!
					</p>
			`,
			});

			if (error) {
				console.error('❌ Error:', error);
				return;
			}

			console.log('✅ SUCCESS! Email sent!');
			console.log('\n📧 Email Details:');
			console.log('   ID:', data.id);
			console.log('   From: noreply@gibli.eu');
			console.log('   To:', email);
			console.log('\nEmail sent Check your inbox!\n');
			await delay(1000); // Add a delay of 1 second between each email to avoid hitting rate limits
		} catch (error) {
			console.error('❌ Unexpected error:', error.message);
		}
	}

}

testEmail();