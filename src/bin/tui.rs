use crossterm::{
    event::{self, DisableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Tabs},
    Frame, Terminal,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    error::Error,
    fs, io,
    time::{Duration, Instant},
};

use skychat::convo::server::ConvoMessage;
use skychat::convo::{client::ConvoClient, manager::SerializedCredentials};

type GroupId = Vec<u8>;

#[derive(PartialEq)]
enum InputMode {
    Normal,
    ChooseUsername,
    Chatting,
    AcceptingInvite,
    CreatingGroup,
    EnterServerAddress,
}

#[derive(PartialEq)]
enum TabMode {
    Users,
    Invites,
    Groups,
    Command,
}

struct GroupInfo {
    name: String,
    id: GroupId,
}

struct User {
    name: String,
    user_id: String,
    key_package: Vec<u8>,
}

struct App {
    input: String,
    input_mode: InputMode,
    tab_mode: TabMode,
    users: Vec<User>,
    messages: Vec<String>,
    groups: Vec<GroupInfo>,
    client: Option<ConvoClient>,
    current_group_id: Option<GroupId>,
    incoming_alert: Option<String>,
    messages_scroll: ListState,
    users_scroll: ListState,
    groups_scroll: ListState,
    invites_scroll: ListState,
    server_address: String,
    name: String,
}

pub struct Settings {
    pub name: String,
    pub server_ip: String,
}

impl Default for App {
    fn default() -> App {
        let mut messages_scroll = ListState::default();
        messages_scroll.select(Some(0));
        let mut users_scroll = ListState::default();
        users_scroll.select(Some(0));
        let mut groups_scroll = ListState::default();
        groups_scroll.select(Some(0));
        let mut invites_scroll = ListState::default();
        invites_scroll.select(Some(0));
        let default_server_address = "https://skychat.fosse.co".to_string();

        App {
            input_mode: InputMode::EnterServerAddress,
            server_address: default_server_address.clone(),
            input: default_server_address.clone(),
            tab_mode: TabMode::Users,
            users: Vec::new(),
            messages: Vec::new(),
            groups: Vec::new(),
            client: None,
            current_group_id: None,
            incoming_alert: None,
            messages_scroll,
            users_scroll,
            groups_scroll,
            invites_scroll,
            name: "".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct SerializedSettings {
    name: String,
    server_address: String,
}

impl App {
    async fn load_state(&mut self, path: &str) {
        let keys_path = format!("{}/keys.json", path);
        let settings_path = format!("{}/settings.json", path);
        // read settings.json:
        if let Ok(settings_json) = fs::read_to_string(settings_path) {
            let serialized_settings: SerializedSettings =
                serde_json::from_str(&settings_json).unwrap();
            self.load_settings(serialized_settings).await;
        }
        // read keys.json:
        if let Ok(keys_json) = fs::read_to_string(keys_path) {
            let serialized_credentials: SerializedCredentials =
                serde_json::from_str(&keys_json).unwrap();
            self.load_credentials(serialized_credentials).await;
        }
    }

    async fn save_state(&mut self, path: &str) {
        let keys_path = format!("{}/keys.json", path);
        let settings_path = format!("{}/settings.json", path);
        let serialized_settings = self.get_settings();
        let settings_json = serde_json::to_string(&serialized_settings).unwrap();
        fs::write(settings_path, settings_json).unwrap();

        let serialized_credentials = self.client.as_mut().unwrap().manager.save_state();
        let keys_json = serde_json::to_string(&serialized_credentials).unwrap();
        fs::write(keys_path, keys_json).unwrap();
    }

    // async fn save_credentials(&mut self, ) {
    //     let keysPath = format!("{}/keys.json", path);
    //     let settingsPath = format!("{}/settings.json", path);
    //     self.save_settings(path).await;
    // }

    async fn load_credentials(&mut self, serialized: SerializedCredentials) {
        if let Some(client) = &mut self.client {
            client.manager.load_state(serialized).unwrap();
        } else {
            // create a new client
            let mut client = ConvoClient::new(self.name.clone());
            client.manager.load_state(serialized).unwrap();
            self.client = Some(client);

            let res = self
                .client
                .as_mut()
                .unwrap()
                .connect_to_server(self.server_address.to_string())
                .await;

            if res.is_ok() {
                self.input.clear();
                self.update_users().await;
                self.input_mode = InputMode::Normal;
                self.incoming_alert = None;
            } else {
                self.input.clear();
                self.incoming_alert = Some("Failed to connect to server".to_string());
                self.input_mode = InputMode::EnterServerAddress;
            }
        }
    }

    fn get_settings(&mut self) -> SerializedSettings {
        SerializedSettings {
            name: self.client.as_ref().unwrap().name.clone(),
            server_address: self.server_address.clone(),
        }
    }

    async fn load_settings(&mut self, serialized: SerializedSettings) {
        self.name = serialized.name;
        self.server_address = serialized.server_address;
    }

    fn scroll_messages(&mut self, up: bool) {
        if let Some(client) = &self.client {
            if let Some(group_id) = &self.current_group_id {
                let messages = client.get_group_messages(&group_id);
                let len = messages.len();

                if len == 0 {
                    return;
                }

                let i = match self.messages_scroll.selected() {
                    Some(i) => {
                        if up {
                            i.saturating_sub(1)
                        } else {
                            if i >= len - 1 {
                                i
                            } else {
                                i + 1
                            }
                        }
                    }
                    None => 0,
                };
                self.messages_scroll.select(Some(i));
            }
        }
    }

    fn scroll_users(&mut self, up: bool) {
        let len = self.users.len();

        let i = match self.users_scroll.selected() {
            Some(i) => {
                if up {
                    i.saturating_sub(1)
                } else {
                    if i < len.clone().saturating_sub(1) {
                        i + 1
                    } else {
                        i
                    }
                }
            }
            None => 0,
        };
        self.users_scroll.select(Some(i));
    }

    fn scroll_groups(&mut self, up: bool) {
        let len = self.groups.len();
        let i = match self.groups_scroll.selected() {
            Some(i) => {
                if up {
                    i.saturating_sub(1)
                } else {
                    if i < len.clone().saturating_sub(1) {
                        i + 1
                    } else {
                        i
                    }
                }
            }
            None => 0,
        };
        self.groups_scroll.select(Some(i));
    }

    fn scroll_invites(&mut self, up: bool) {
        let len = self.client.as_ref().unwrap().pending_invites.len();
        let i = match self.invites_scroll.selected() {
            Some(i) => {
                if up {
                    i.saturating_sub(1)
                } else {
                    if i < len.clone().saturating_sub(1) {
                        i + 1
                    } else {
                        i
                    }
                }
            }
            None => 0,
        };
        self.invites_scroll.select(Some(i));
    }

    async fn update_users(&mut self) {
        if let Some(client) = &mut self.client {
            let users_list = client.list_users().await;
            self.users = users_list
                .into_iter()
                .filter(|u| u.user_id != client.user_id)
                .map(|u| User {
                    name: u.name,
                    user_id: u.user_id,
                    key_package: u.serialized_key_package,
                })
                .collect();
        }
    }

    async fn create_group(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(selected) = self.users_scroll.selected() {
                let user = &self.users[selected];
                let group_name = format!("{}", self.input.clone());

                client.create_group(group_name.clone()).await;
                let group_id = client.get_group_id(group_name).await;

                client
                    .invite_user_to_group(
                        user.user_id.clone(),
                        group_id.clone(),
                        user.key_package.clone(),
                    )
                    .await;

                self.current_group_id = Some(group_id);
                self.messages
                    .push("Group created and invitation sent!".to_string());
            }
        }
    }

    async fn check_messages(&mut self) {
        if let Some(client) = &mut self.client {
            let new_messages = client
                .check_incoming_messages(self.current_group_id.clone())
                .await;
            if !new_messages.is_empty() {
                self.process_new_messages(new_messages).await;
                self.save_state("./").await;
                // Auto-scroll when new messages arrive
                self.scroll_to_bottom();
            }
        }
    }

    async fn send_message(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(group_id) = &self.current_group_id {
                if !self.input.is_empty() {
                    // check if the message is a /inv <user_name> command:
                    if self.input.starts_with("/inv ") {
                        let user_name = self.input[5..].to_string();
                        // TODO: breaks if people have the same name!
                        // let user_id = client.name_to_id(user_name);
                        // let key_package = self.users.iter().find(|u| u.name == user_name).unwrap().key_package.clone();
                        let user = self
                            .users
                            .iter()
                            .find(|user| user.name == user_name.clone())
                            .expect("user not found!");

                        let key_package = user.key_package.clone();
                        let user_id = user.user_id.clone();
                        client
                            .invite_user_to_group(user_id, group_id.clone(), key_package.clone())
                            .await;

                        client
                            .send_message(
                                group_id.clone(),
                                format!(
                                    "<{} invited {} to join the group!",
                                    client.name, user_name
                                ),
                            )
                            .await;
                        self.input.clear();
                        return;
                    }

                    if self.input.starts_with("/kick ") {
                        let user_name = self.input[5..].to_string();
                        let user = self
                            .users
                            .iter()
                            .find(|user| user.name == user_name.clone())
                            .expect("user not found!");
                        // client.kick_user_from_group(user.user_id.clone(), group_id.clone()).await;
                    }

                    client
                        .send_message(group_id.clone(), self.input.clone())
                        .await;
                    self.input.clear();
                    self.scroll_to_bottom();
                }
            }
        }
    }
    async fn update_groups(&mut self) {
        if let Some(client) = &self.client {
            self.groups.clear();
            // Iterate through the client's groups
            for (group_id, group) in &client.manager.groups {
                self.groups.push(GroupInfo {
                    name: group.name.clone(),
                    id: group_id.clone(),
                });
            }
        }
    }

    async fn enter_group(&mut self) {
        if let Some(selected) = self.groups_scroll.selected() {
            if selected < self.groups.len() {
                let group = &self.groups[selected];
                self.current_group_id = Some(group.id.clone());
                self.input_mode = InputMode::Chatting;
                self.tab_mode = TabMode::Users;
            }
        }
    }
    async fn process_new_messages(&mut self, messages: Vec<ConvoMessage>) {
        if let Some(client) = &mut self.client {
            for message in messages {
                // do something with incoming messages
                // if we're not in the group view, add it to the alerts!
                if self.input_mode != InputMode::Chatting {
                    let user_name = client.id_to_name.get(&message.sender_id).unwrap().clone();
                    self.incoming_alert = Some(format!("New message from {}", user_name));
                }
            }
        }
    }

    async fn accept_invite(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(selected) = self.invites_scroll.selected() {
                if selected < client.pending_invites.len() {
                    let invite = client.pending_invites.remove(selected);
                    client.process_invite(invite.invite).await;
                    self.input_mode = InputMode::Normal;
                    self.tab_mode = TabMode::Groups;
                    self.invites_scroll.select(None);
                    self.update_groups().await;
                }
            }
        }
    }

    async fn decline_invite(&mut self) {
        if let Some(selected) = self.invites_scroll.selected() {
            let client = self.client.as_mut().expect("client not found!");
            if selected < client.pending_invites.len() {
                client.pending_invites.remove(selected);
                self.invites_scroll.select(None);
                self.input_mode = InputMode::Normal;
            }
        }
    }

    fn scroll_to_bottom(&mut self) {
        if let Some(client) = &self.client {
            if let Some(group_id) = &self.current_group_id {
                let messages = client.get_renderable_messages(&group_id);
                if !messages.is_empty() {
                    self.messages_scroll.select(Some(messages.len() - 1));
                }
            }
        }
    }
}

fn ui<B: Backend>(f: &mut Frame<B>, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(3),
        ])
        .split(f.size());

    let middle_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(chunks[2]);

    // Render tabs in all modes except Username, CreatingGroup, and AcceptingInvite
    if app.input_mode != InputMode::ChooseUsername
        && app.input_mode != InputMode::CreatingGroup
        && app.input_mode != InputMode::AcceptingInvite
        && app.input_mode != InputMode::Chatting
        && app.input_mode != InputMode::EnterServerAddress
    {
        let titles = vec!["Users", "Groups", "Invites", "Commands"];
        let selected = match app.tab_mode {
            TabMode::Users => 0,
            TabMode::Groups => 1,
            TabMode::Invites => 2,
            TabMode::Command => 3,
        };
        let tabs = Tabs::new(titles)
            .block(Block::default().title("Tabs").borders(Borders::ALL))
            .select(selected)
            .style(Style::default())
            .highlight_style(
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD),
            );
        f.render_widget(tabs, chunks[0]);
    }

    // Render to the last section (chunks[3])
    if let Some(alert) = &app.incoming_alert {
        let input = Paragraph::new(alert.as_str()).block(Block::default().borders(Borders::ALL));
        f.render_widget(input, chunks[1]);
    }

    match app.input_mode {
        InputMode::Normal => match app.tab_mode {
            TabMode::Command => {
                let command_list = List::new(vec![ListItem::new(
                    "Enter /save to save the application state / settings\n",
                )])
                .block(Block::default().title("Command mode").borders(Borders::ALL));
                f.render_widget(command_list, chunks[2]);
            }
            TabMode::Groups => {
                let groups: Vec<ListItem> = app
                    .groups
                    .iter()
                    .enumerate()
                    .map(|(i, group)| {
                        let style = if Some(i) == app.groups_scroll.selected() {
                            Style::default().fg(Color::Yellow)
                        } else {
                            Style::default()
                        };
                        ListItem::new(group.name.clone()).style(style)
                    })
                    .collect();

                let groups_list = List::new(groups)
                    .block(Block::default().title("Your Groups").borders(Borders::ALL))
                    .highlight_style(Style::default().add_modifier(Modifier::BOLD));

                f.render_stateful_widget(groups_list, chunks[2], &mut app.groups_scroll);
            }
            TabMode::Users => {
                let users: Vec<ListItem> = app
                    .users
                    .iter()
                    .enumerate()
                    .map(|(i, user)| {
                        let style = if Some(i) == app.users_scroll.selected() {
                            Style::default().fg(Color::Yellow)
                        } else {
                            Style::default()
                        };
                        ListItem::new(user.name.clone()).style(style)
                    })
                    .collect();

                let our_user_name = app.client.as_ref().unwrap().name.clone();
                // let empty_list = List::new(vec![ListItem::new(format!(
                //     "Users <You are: {}>",
                //     our_user_name
                // ))])
                // .block(Block::default().borders(Borders::ALL))
                // .highlight_style(Style::default().add_modifier(Modifier::BOLD));
                // f.render_widget(empty_list, chunks[1]);

                let users_list = List::new(users)
                    .block(
                        Block::default()
                            .title(format!("Global Users <You are: {}>", our_user_name))
                            .borders(Borders::ALL),
                    )
                    .highlight_style(Style::default().add_modifier(Modifier::BOLD));

                f.render_stateful_widget(users_list, chunks[2], &mut app.users_scroll);
            }
            TabMode::Invites => {
                let client = app.client.as_ref().expect("client not found!");
                let invites: Vec<ListItem> = client
                    .pending_invites
                    .iter()
                    .enumerate()
                    .map(|(i, invite)| {
                        let style = if Some(i) == app.invites_scroll.selected() {
                            Style::default().fg(Color::Yellow)
                        } else {
                            Style::default()
                        };
                        ListItem::new(format!(
                            "Invite to {} from {}",
                            invite.group_name, invite.sender_name
                        ))
                        .style(style)
                    })
                    .collect();

                let invites_list = List::new(invites)
                    .block(
                        Block::default()
                            .title("Pending Invites")
                            .borders(Borders::ALL),
                    )
                    .highlight_style(Style::default().add_modifier(Modifier::BOLD));

                f.render_stateful_widget(invites_list, chunks[2], &mut app.invites_scroll);
            }
        },
        InputMode::ChooseUsername => {
            // let instructions = "\nEnter a username + Enter to get started!\nArrow keys + Enter to select things\nEsc to go back / quit";
            // let input = Paragraph::new(instructions.to_string()).block(
            //     Block::default()
            //         .title("Welcome to SkyChat!")
            //         .borders(Borders::ALL),
            // );
            // f.render_widget(input, chunks[2]);
        }
        InputMode::EnterServerAddress => {
            let instructions = "\nEnter the server address + Enter to connect!\nArrow keys + Enter to select things\nEsc to go back / quit";
            let input = Paragraph::new(instructions.to_string()).block(
                Block::default()
                    .title("Welcome to SkyChat!")
                    .borders(Borders::ALL),
            );
            f.render_widget(input, chunks[2]);
        }
        InputMode::CreatingGroup => {
            let user_strings = vec![app.users[app.users_scroll.selected().unwrap()].name.clone()];
            let users: Vec<ListItem> = user_strings
                .iter()
                .map(|u| ListItem::new(u.clone()))
                .collect();

            let block = List::new(users).block(
                Block::default()
                    .title("Creating a group chat with this user")
                    .borders(Borders::ALL),
            );

            f.render_widget(block, chunks[2]);
        }
        InputMode::Chatting => {
            if let Some(client) = &app.client {
                if let Some(group_id) = &app.current_group_id {
                    let message_items = client.get_group_messages(&group_id);

                    // assign a color to each sender:
                    let mut sender_colors = HashMap::new();
                    let mut color_index = 0;
                    let colors = [
                        Color::Red,
                        Color::Blue,
                        Color::Magenta,
                        Color::Cyan,
                        Color::LightBlue,
                        // Color::LightGreen,
                        // Color::LightYellow,
                        Color::LightMagenta,
                        Color::LightCyan,
                    ];

                    for sender in client.id_to_name.keys() {
                        sender_colors.insert(sender.clone(), colors[color_index % colors.len()]);
                        color_index += 1;
                    }

                    // TODO: highlight the message that is selected:
                    let messages: Vec<ListItem> = message_items
                        .iter()
                        .enumerate()
                        .map(|(i, m)| {
                            let user_style = if m.sender_id == client.user_id {
                                Style::default().fg(Color::Green)
                            } else {
                                Style::default()
                                    .fg(sender_colors.get(&m.sender_id).unwrap().clone())
                            };

                            let message_style = if Some(i) == app.messages_scroll.selected() {
                                Style::default().fg(Color::Yellow)
                            } else {
                                Style::default()
                            };

                            let sender_name = format!(
                                "{}: ",
                                client.id_to_name.get(&m.sender_id).unwrap().clone()
                            );

                            // return 2 spans, one for the sender and one for the message:
                            let sender_span = Span::styled(sender_name, user_style);
                            let message_span = Span::styled(m.text.clone(), message_style);
                            let spans = vec![sender_span, message_span];
                            ListItem::new(Line::from(spans))
                        })
                        .collect();

                    let our_user_name = client.name.clone();
                    let messages_list = List::new(messages).block(
                        Block::default()
                            .title(format!("Messages"))
                            .borders(Borders::ALL),
                    );

                    f.render_stateful_widget(
                        messages_list,
                        middle_chunks[0],
                        &mut app.messages_scroll,
                    );

                    // list the users:
                    let users: Vec<ListItem> = app
                        .users
                        .iter()
                        .map(|u| ListItem::new(u.name.clone()))
                        .collect();

                    // TODO: filter the users to only include the ones in the group:
                    let users_list = List::new(users)
                        .block(Block::default().title("Global Users").borders(Borders::ALL));
                    f.render_widget(users_list.clone(), middle_chunks[1]);

                    // in place of the tabs list, render You are: <your name>
                    let title = format!("You are: {}", our_user_name);
                    let title_widget = List::new(vec![ListItem::new(title.clone())])
                        .block(Block::default().borders(Borders::ALL));
                    f.render_widget(title_widget, chunks[0]);
                }
            }
        }
        InputMode::AcceptingInvite => {
            if let Some(selected) = app.invites_scroll.selected() {
                let client = app.client.as_ref().expect("client not found!");
                if let Some(invite) = client.pending_invites.get(selected) {
                    let text = format!(
                        "Accept invite to group {} from {}? (Y/n)",
                        invite.group_name, invite.sender_name
                    );
                    let prompt = Paragraph::new(text).block(
                        Block::default()
                            .title("Processing Invite")
                            .borders(Borders::ALL),
                    );
                    f.render_widget(prompt, chunks[2]);
                }
            }
        }
    }

    let input_title = match app.input_mode {
        InputMode::Normal => "Use Arrow keys / Enter to navigate, <Esc to exit>",
        InputMode::ChooseUsername => "Enter username",
        InputMode::Chatting => "Enter message <Esc to go back>",
        InputMode::AcceptingInvite => "Press Y/n to accept/decline <Esc to go back>",
        InputMode::CreatingGroup => "Enter a name for the group! <Esc to go back>",
        InputMode::EnterServerAddress => "Enter server address",
    };

    let input = Paragraph::new(app.input.as_str())
        .block(Block::default().title(input_title).borders(Borders::ALL));
    f.render_widget(input, chunks[3]);
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Terminal setup
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::default();
    app.load_state("./").await;
    let mut last_update = Instant::now();

    loop {
        // Update users and groups list every 5 seconds
        if Instant::now().duration_since(last_update) >= Duration::from_secs(3) {
            app.update_users().await;
            app.update_groups().await;
            app.check_messages().await;

            // if app.input_mode == InputMode::Chatting {
            //     app.check_messages().await;
            // }

            last_update = Instant::now();
        }

        terminal.draw(|f| ui(f, &mut app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match app.input_mode {
                    InputMode::Normal => match key.code {
                        KeyCode::Char(c) => match app.tab_mode {
                            TabMode::Command => {
                                app.input.push(c);
                            }
                            _ => {}
                        },
                        KeyCode::Backspace => match app.tab_mode {
                            TabMode::Command => {
                                app.input.pop();
                            }
                            _ => {}
                        },
                        KeyCode::Esc => break,
                        // use left and right arrows to switch tabs
                        KeyCode::Left => {
                            app.tab_mode = match app.tab_mode {
                                TabMode::Users => TabMode::Command,
                                TabMode::Groups => TabMode::Users,
                                TabMode::Invites => TabMode::Groups,
                                TabMode::Command => TabMode::Invites,
                            };
                            app.input.clear();
                            app.incoming_alert = None;
                        }
                        KeyCode::Right => {
                            app.tab_mode = match app.tab_mode {
                                TabMode::Users => TabMode::Groups,
                                TabMode::Groups => TabMode::Invites,
                                TabMode::Invites => TabMode::Command,
                                TabMode::Command => TabMode::Users,
                            };
                            app.input.clear();
                            app.incoming_alert = None;
                        }
                        KeyCode::Up => match app.tab_mode {
                            TabMode::Users => {
                                app.scroll_users(true);
                            }
                            TabMode::Groups => {
                                app.scroll_groups(true);
                            }
                            TabMode::Invites => {
                                app.scroll_invites(true);
                            }
                            TabMode::Command => {
                                // app.scroll_command(true);
                            }
                        },
                        KeyCode::Down => match app.tab_mode {
                            TabMode::Users => {
                                app.scroll_users(false);
                            }
                            TabMode::Groups => {
                                app.scroll_groups(false);
                            }
                            TabMode::Invites => {
                                app.scroll_invites(false);
                            }
                            TabMode::Command => {
                                // app.scroll_command(false);
                            }
                        },
                        KeyCode::Enter => match app.tab_mode {
                            TabMode::Users => {
                                if app.users_scroll.selected().is_some() && app.users.len() > 0 {
                                    app.input_mode = InputMode::CreatingGroup;
                                }
                            }
                            TabMode::Groups => {
                                app.enter_group().await;
                            }
                            TabMode::Invites => {
                                if app.invites_scroll.selected().is_some() {
                                    app.input_mode = InputMode::AcceptingInvite;
                                }
                            }
                            TabMode::Command => {
                                if app.input.starts_with("/save") {
                                    app.save_state("./").await;
                                    app.input.clear();
                                    app.incoming_alert = Some("State saved".to_string());
                                }
                            }
                        },
                        _ => {}
                    },
                    InputMode::ChooseUsername => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                let mut client = ConvoClient::new(app.input.clone());
                                let res = client
                                    .connect_to_server(app.server_address.to_string())
                                    .await;

                                if res.is_ok() {
                                    app.client = Some(client);
                                    app.input.clear();
                                    app.update_users().await;
                                    app.input_mode = InputMode::Normal;
                                    app.incoming_alert = None;
                                } else {
                                    app.input.clear();
                                    app.incoming_alert =
                                        Some("Failed to connect to server".to_string());
                                    app.input_mode = InputMode::EnterServerAddress;
                                }
                            }
                        }
                        KeyCode::Char(c) => {
                            app.input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.input.pop();
                        }
                        KeyCode::Esc => {
                            break;
                        }
                        _ => {}
                    },
                    InputMode::EnterServerAddress => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                app.server_address = app.input.to_string();
                                app.input.clear();
                                app.input_mode = InputMode::ChooseUsername;
                            }
                        }
                        KeyCode::Char(c) => {
                            app.input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.input.pop();
                        }
                        KeyCode::Esc => {
                            break;
                        }
                        _ => {}
                    },
                    InputMode::CreatingGroup => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                app.create_group().await;
                                app.update_groups().await;
                                app.tab_mode = TabMode::Groups;
                                app.input.clear();
                                app.input_mode = InputMode::Normal;
                            }
                        }
                        KeyCode::Char(c) => {
                            app.input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.input.pop();
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.input.clear();
                        }
                        _ => {}
                    },
                    InputMode::Chatting => match key.code {
                        KeyCode::Enter => {
                            app.send_message().await;
                        }
                        KeyCode::Char(c) => {
                            app.input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.input.pop();
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.input.clear();
                        }
                        KeyCode::Up => {
                            app.scroll_messages(true);
                        }
                        KeyCode::Down => {
                            app.scroll_messages(false);
                        }
                        _ => {}
                    },
                    InputMode::AcceptingInvite => match key.code {
                        KeyCode::Char('y') => {
                            app.accept_invite().await;
                        }
                        KeyCode::Enter => {
                            app.accept_invite().await;
                        }
                        KeyCode::Char('n') => {
                            app.decline_invite().await;
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.invites_scroll.select(None);
                            app.input.clear();
                        }
                        _ => {}
                    },
                }
            }
        }
    }

    // Cleanup
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
