const { Client, Collection, GatewayIntentBits, IntentsBitField, ActionRowBuilder, StringSelectMenuBuilder, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const getGPT4js = require("gpt4js");

require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
		    GatewayIntentBits.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
		    GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


// const config = require('./config.json');
const welcome = require('./welcome.js');
const goodbye = require('./goodbye.js');
require("./deploy.js");

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    welcome(client);
    goodbye(client);
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// client.on('messageCreate', async (msg) => {
//     try {
//         // Check if the message starts with the specific phrase
//         if (msg.content.toLowerCase().startsWith("kupal ka ba tph")) {
//             let replyMessage = '';
            
//             // Check if the message is a reply
//             if (msg.reference) {
//                 // Fetch the replied-to message
//                 const repliedTo = await msg.channel.messages.fetch(msg.reference.messageId);
                
//                 replyMessage = `Tinatanong mo '${repliedTo.content}'? Bat hindi mo muna isipin yan ${msg.author.toString()}?`;
//             } else {
//                 replyMessage = `Bat ako tinatanong mo, ${msg.author.toString()}? Tanungin mo sarili mo!`;
//             }
            
//             // Reply with the appropriate response
//             msg.reply(replyMessage);
//         }
//     } catch (err) {
//         console.error('An error occurred:', err);
//     }
// });

// GPT-4 Chat Function
async function startChatGPT4(messages, options = { provider: "Nextway", model: "gpt-4o-free" }) {
    try {
		
        const GPT4js = await getGPT4js();
        const provider = GPT4js.createProvider(options.provider);

        const text = await provider.chatCompletion(messages, options, (data) => {
            console.log("Streaming data:", data);
        });

        return text;
    } catch (error) {
        console.error("Error in chatCompletion:", error);
        return "An error occurred while communicating with the GPT-4 provider.";
    }
}

// Discord Command Handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Command: !ai
    if (message.content.toLowerCase().startsWith('!ai')) {
        const query = message.content.slice(4).trim(); // Remove "!ai" from the message
        const messages = [{ role: "user", content: query }];

        if (!query) {
            message.reply('Please provide a message or query for GPT-4!');
            return;
        }

        try {
			await message.channel.sendTyping();

            // Get GPT-4 response
            const response = await startChatGPT4(messages);

            // Reply to the user with the GPT-4 response
            message.reply(response);
        } catch (err) {
            console.error('Error processing !ai command:', err);
            message.reply('Sorry, I encountered an error processing your request.');
        }
    }
});



client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'reaction_roles') {
      const selectedRoleId = interaction.values[0]; 
      const member = interaction.member;


      const allRoleIds = ['1309992669593997332', '1309992791585325076', '1309992893125103706'];

      try {
         
          const rolesToRemove = allRoleIds.filter((roleId) => roleId !== selectedRoleId);
          await member.roles.remove(rolesToRemove);


          if (!member.roles.cache.has(selectedRoleId)) {
              await member.roles.add(selectedRoleId);
          }

          await interaction.reply({
              content: `You now have the role: <@&${selectedRoleId}>`,
              ephemeral: true,
          });
      } catch (error) {
          console.error('Error managing roles:', error);
          await interaction.reply({
              content: 'An error occurred while updating your roles. Please try again.',
              ephemeral: true,
          });
      }
  }
});


client.on('messageCreate', async (message) => {
  if (message.content === '!reactionrole') {
      const roles = [
          { label: 'Luzon', value: '1309992669593997332' },
          { label: 'Visayas', value: '1309992791585325076' },
          { label: 'Mindanao', value: '1309992893125103706' },
      ];

      const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
              .setCustomId('reaction_roles')
              .setPlaceholder('Select a role')
              .addOptions(
                  roles.map((role) => ({
                      label: role.label,
                      value: role.value,
                  }))
              )
      );

      await message.channel.send({
          content: 'Where you at:',
          components: [row],
      });
  }
});


client.login(process.env.TOKEN);
