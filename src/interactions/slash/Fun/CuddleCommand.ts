import { ApplicationCommandData } from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums.js";

const commandConfig = {
    name: "cuddle",
    description: "Give someone a cuddle",
    options: [
        {
            name: "user",
            description: "The user to cuddle with",
            type: ApplicationCommandOptionTypes.USER,
            autocomplete: false,
            required: false
        }
    ]
} as ApplicationCommandData;

export default commandConfig;
