# Rubika Bot Setup

SetadInfo uses only Rubika's official Bot API v3.

Official references:

- Bot creation: https://rubika.ir/botapi
- API methods: https://rubika.ir/botapi/methods
- Official BotFather: https://rubika.ir/BotFather

## Create The Bot

1. Open Rubika's official `BotFather`.
2. Send `/newbot`.
3. Choose the bot name requested by BotFather.
4. Store the returned token as a secret. Do not place it in source control or chat logs.
5. Set `RUBIKA_BOT_TOKEN=<token>` in `/opt/setadinfo/.env`.
6. Recreate the API and worker containers:

```bash
cd /opt/setadinfo/current
docker compose --env-file /opt/setadinfo/.env up -d --force-recreate api worker beat
```

## Runtime Bot

Use your own bot name, username, and token. The token belongs only in the
server environment file and should never be stored in repository files, issue
comments, screenshots, or chat logs.

Default destinations are optional. The recommended workflow is to register one
or more explicit recipients and select them per monitor.

The Rubika web-client URL identifiers for groups/channels are not Bot API
`chat_id` values. Direct sends to those URL identifiers return
`INVALID_INPUT`; use `getUpdates` after a bot command or mention exposes the
real Bot API IDs.

## Connect Destinations

### User

1. The user opens the bot and sends at least one message. Opening the link
   without sending a message is not sufficient.
2. In SetadInfo Settings, select `دریافت chat ID`.
3. Add the discovered ID as type `کاربر`, give it a clear name, and save it.

### Group Or Chat

1. Add the bot to the group.
2. Allow it to read the update needed to identify the group and send messages.
3. Send a new message in the group after adding the bot. Mention the bot
   username or send a bot command so the update is explicit.
4. Discover the ID in Settings and save it as type `گروه / گفتگو`.

### Channel

1. Add the bot to the channel as an administrator.
2. Grant permission to publish messages.
3. Publish `/start` or mention the bot username, then discover the returned Bot
   API chat ID in Settings.
4. Save it as type `کانال`.

## Assign Recipients

When creating or editing a filter monitor or single-item monitor:

1. Enable Rubika notifications.
2. Select any number of enabled destinations.
3. Save the monitor.

Destinations can be added, disabled, edited, removed, or reassigned later. Notifications are sent only when a successful check detects at least one new or changed listing or offer.

After configuring each destination, use the Settings test-send action before
assigning it to a monitor.
