# Rubika Integration Notes

Rubika documents its official bot API at `https://rubika.ir/botapi`.
Runtime requests use `https://botapi.rubika.ir/v3/{token}/{method}`.

Useful official methods:

- `sendMessage`: send text/keypad/inline-keypad messages.
- `getUpdates`: retrieve bot updates and chat ids.
- `getChat`: inspect a chat.
- Group/channel docs mention `sendMessage`, `editMessageText`, and `deleteMessage`.

Runtime approach:

1. Create a bot through Rubika `@BotFather`.
2. Put the bot token in `RUBIKA_BOT_TOKEN`.
3. Have the target user/group message the bot.
4. Open Settings in SetadInfo and use `getUpdates` discovery to capture `chat_id`.
5. Attach the `chat_id` to a task or set `RUBIKA_DEFAULT_CHAT_ID`.
6. Worker sends notifications only for new or changed task matches.

The `getUpdates` response returns `next_offset_id`; the next request sends that
cursor using Rubika's current documented `offset_id` field.
Any Rubika response whose `status` is not `OK` is treated as a failed request;
`INVALID_INPUT` can no longer be reported as a successful send.

For group/channel discovery, allow the bot to receive messages and send a bot
command or mention the bot username. Rubika web-client URL identifiers are not
Bot API chat IDs.

The official Bot API does not send to a phone number. A bot token and a chat ID created after the user messages the bot are required.

Do not automate a personal Rubika account or use reverse-engineered user APIs for this app.
