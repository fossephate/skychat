use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use rand::Rng;
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Span, Spans},
    widgets::{Block, Borders, List, ListItem, Paragraph, Tabs},
    Frame, Terminal,
};
use std::{
    error::Error,
    io,
    time::{Duration, Instant},
};

use skychat::convo::client::ConvoClient;
use skychat::convo::server::{ConvoInvite, ConvoMessage};

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
    selected_user: Option<usize>,
    selected_invite: Option<usize>,
    selected_group: Option<usize>,
    messages: Vec<String>,
    pending_invites: Vec<PendingInvite>,
    groups: Vec<GroupInfo>,
    client: Option<ConvoClient>,
    current_group_id: Option<GroupId>,
    last_update: Instant,
    incoming_alert: Option<String>,
}

struct PendingInvite {
    group_name: String,
    sender_name: String,
    invite: ConvoInvite,
}

impl Default for App {
    fn default() -> App {
        App {
            input: String::new(),
            input_mode: InputMode::EnterServerAddress,
            tab_mode: TabMode::Users,
            users: Vec::new(),
            selected_user: None,
            selected_invite: None,
            selected_group: None,
            messages: Vec::new(),
            pending_invites: Vec::new(),
            groups: Vec::new(),
            client: None,
            current_group_id: None,
            last_update: Instant::now(),
            incoming_alert: None,
        }
    }
}

impl App {
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
            if let Some(selected) = self.selected_user {
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

            self.process_new_messages(new_messages).await;
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
                        self.input.clear();
                        return;
                    }

                    client
                        .send_message(group_id.clone(), self.input.clone())
                        .await;
                    self.input.clear();
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
        if let Some(selected) = self.selected_group {
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
                if let Some(invite) = message.invite {
                    // Add to pending invites
                    let sender_name = client
                        .id_to_name
                        .get(&message.sender_id)
                        .unwrap_or(&message.sender_id)
                        .clone();

                    self.pending_invites.push(PendingInvite {
                        group_name: invite.group_name.clone(),
                        sender_name,
                        invite,
                    });
                }
            }
        }
    }

    async fn accept_invite(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(selected) = self.selected_invite {
                if selected < self.pending_invites.len() {
                    let invite = self.pending_invites.remove(selected);
                    client.process_invite(invite.invite).await;
                    self.input_mode = InputMode::Normal;
                    self.tab_mode = TabMode::Groups;
                    self.selected_invite = None;
                    self.update_groups().await;
                }
            }
        }
    }

    async fn decline_invite(&mut self) {
        if let Some(selected) = self.selected_invite {
            if selected < self.pending_invites.len() {
                self.pending_invites.remove(selected);
                self.selected_invite = None;
                self.input_mode = InputMode::Normal;
            }
        }
    }
}

fn ui<B: Backend>(f: &mut Frame<B>, app: &App) {
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
        let titles = vec!["Users", "Groups", "Invites"];
        let selected = match app.tab_mode {
            TabMode::Users => 0,
            TabMode::Groups => 1,
            TabMode::Invites => 2,
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
            TabMode::Groups => {
                let groups: Vec<ListItem> = app
                    .groups
                    .iter()
                    .enumerate()
                    .map(|(i, group)| {
                        let style = if Some(i) == app.selected_group {
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

                f.render_widget(groups_list, chunks[2]);
            }
            TabMode::Users => {
                let users: Vec<ListItem> = app
                    .users
                    .iter()
                    .enumerate()
                    .map(|(i, user)| {
                        let style = if Some(i) == app.selected_user {
                            Style::default().fg(Color::Yellow)
                        } else {
                            Style::default()
                        };
                        ListItem::new(user.name.clone()).style(style)
                    })
                    .collect();

                let our_user_name = app.client.as_ref().unwrap().name.clone();

                let users_list = List::new(users)
                    .block(
                        Block::default()
                            .title(format!("Users <You are: {}>", our_user_name))
                            .borders(Borders::ALL),
                    )
                    .highlight_style(Style::default().add_modifier(Modifier::BOLD));

                f.render_widget(users_list, chunks[2]);
            }
            TabMode::Invites => {
                let invites: Vec<ListItem> = app
                    .pending_invites
                    .iter()
                    .enumerate()
                    .map(|(i, invite)| {
                        let style = if Some(i) == app.selected_invite {
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

                f.render_widget(invites_list, chunks[2]);
            }
        },
        InputMode::ChooseUsername => {
            let instructions = "\nEnter a username + Enter to get started!\n'q' to quit\nArrow keys + Enter to select things\nEsc to go back";
            let input = Paragraph::new(instructions.to_string()).block(
                Block::default()
                    .title("Welcome to SkyChat!")
                    .borders(Borders::ALL),
            );
            f.render_widget(input, chunks[2]);
        }
        InputMode::EnterServerAddress => {
            let instructions = "\nEnter the server address + Enter to connect!\n'q' to quit\nArrow keys + Enter to select things\nEsc to go back";
            let input = Paragraph::new(instructions.to_string()).block(
                Block::default()
                    .title("Welcome to SkyChat!")
                    .borders(Borders::ALL),
            );
            f.render_widget(input, chunks[2]);
        }
        InputMode::CreatingGroup => {
            let user_strings = vec!["Alice", "Bob", "Charlie", "David"];
            let users: Vec<ListItem> = user_strings
                .iter()
                .map(|u| ListItem::new(u.clone()))
                .collect();

            let block = List::new(users).block(
                Block::default()
                    .title("Creating a group chat with these users:")
                    .borders(Borders::ALL),
            );

            f.render_widget(block, chunks[2]);
        }
        InputMode::Chatting => {
            if let Some(client) = &app.client {
                if let Some(group_id) = &app.current_group_id {
                    let message_strings = client.get_renderable_messages(group_id.clone());
                    let messages: Vec<ListItem> = message_strings
                        .iter()
                        .map(|m| ListItem::new(m.clone()))
                        .collect();

                    let our_user_name = client.name.clone();
                    let messages_list = List::new(messages).block(
                        Block::default()
                            .title(format!("Messages <You are: {}>", our_user_name))
                            .borders(Borders::ALL),
                    );

                    // list the users:
                    let users: Vec<ListItem> = app
                        .users
                        .iter()
                        .map(|u| ListItem::new(u.name.clone()))
                        .collect();
                    // TODO: filter the users to only include the ones in the group:
                    let users_list = List::new(users)
                        .block(Block::default().title("Users").borders(Borders::ALL));

                    f.render_widget(messages_list.clone(), chunks[2]);
                    f.render_widget(users_list.clone(), middle_chunks[1]);
                }
            }
        }
        InputMode::AcceptingInvite => {
            if let Some(selected) = app.selected_invite {
                if let Some(invite) = app.pending_invites.get(selected) {
                    let text = format!(
                        "Accept invite to group {} from {}? (y/n)",
                        invite.group_name, invite.sender_name
                    );
                    let prompt = Paragraph::new(text).block(
                        Block::default()
                            .title("Accept Invite")
                            .borders(Borders::ALL),
                    );
                    f.render_widget(prompt, chunks[2]);
                }
            }
        }
    }

    let input_title = match app.input_mode {
        InputMode::Normal => "Use Arrow keys / Enter to navigate, q to quit",
        InputMode::ChooseUsername => "Enter username",
        InputMode::Chatting => "Enter message <Esc to go back>",
        InputMode::AcceptingInvite => "y to accept, n to decline <Esc to go back>",
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
    let mut server_address: String = String::new();
    let mut last_update = Instant::now();

    loop {
        // Update users and groups list every 5 seconds
        if Instant::now().duration_since(last_update) >= Duration::from_secs(1) {
            app.update_users().await;
            app.update_groups().await;
            app.check_messages().await;

            // if app.input_mode == InputMode::Chatting {
            //     app.check_messages().await;
            // }

            last_update = Instant::now();
        }

        terminal.draw(|f| ui(f, &app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match app.input_mode {
                    InputMode::Normal => match key.code {
                        KeyCode::Char('q') => break,
                        // use left and right arrows to switch tabs
                        KeyCode::Left => {
                            app.tab_mode = match app.tab_mode {
                                TabMode::Users => TabMode::Invites,
                                TabMode::Groups => TabMode::Users,
                                TabMode::Invites => TabMode::Groups,
                            };
                        }
                        KeyCode::Right => {
                            app.tab_mode = match app.tab_mode {
                                TabMode::Users => TabMode::Groups,
                                TabMode::Groups => TabMode::Invites,
                                TabMode::Invites => TabMode::Users,
                            };
                        }
                        KeyCode::Up => match app.tab_mode {
                            TabMode::Users => {
                                if let Some(selected) = app.selected_user {
                                    if selected > 0 {
                                        app.selected_user = Some(selected - 1);
                                    }
                                } else {
                                    app.selected_user = Some(0);
                                }
                            }
                            TabMode::Groups => {
                                if let Some(selected) = app.selected_group {
                                    if selected > 0 {
                                        app.selected_group = Some(selected - 1);
                                    }
                                } else {
                                    app.selected_group = Some(0);
                                }
                            }
                            TabMode::Invites => {
                                if let Some(selected) = app.selected_invite {
                                    if selected > 0 {
                                        app.selected_invite = Some(selected - 1);
                                    }
                                } else {
                                    app.selected_invite = Some(0);
                                }
                            }
                        },
                        KeyCode::Down => match app.tab_mode {
                            TabMode::Users => {
                                if let Some(selected) = app.selected_user {
                                    if selected < app.users.len().saturating_sub(1) {
                                        app.selected_user = Some(selected + 1);
                                    }
                                } else {
                                    app.selected_user = Some(0);
                                }
                            }
                            TabMode::Groups => {
                                if let Some(selected) = app.selected_group {
                                    if selected < app.groups.len().saturating_sub(1) {
                                        app.selected_group = Some(selected + 1);
                                    }
                                } else {
                                    app.selected_group = Some(0);
                                }
                            }
                            TabMode::Invites => {
                                if let Some(selected) = app.selected_invite {
                                    if selected < app.pending_invites.len().saturating_sub(1) {
                                        app.selected_invite = Some(selected + 1);
                                    }
                                } else {
                                    app.selected_invite = Some(0);
                                }
                            }
                        },
                        KeyCode::Enter => match app.tab_mode {
                            TabMode::Users => {
                                if app.selected_user.is_some() {
                                    app.input_mode = InputMode::CreatingGroup;
                                }
                            }
                            TabMode::Groups => {
                                app.enter_group().await;
                            }
                            TabMode::Invites => {
                                if app.selected_invite.is_some() {
                                    app.input_mode = InputMode::AcceptingInvite;
                                }
                            }
                        },
                        _ => {}
                    },
                    InputMode::ChooseUsername => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                let mut client = ConvoClient::new(app.input.clone());
                                let server_address = format!("http://{}:8080", server_address);
                                let res = client.connect_to_server(server_address.to_string()).await;

                                if res.is_ok() {
                                    app.client = Some(client);
                                    app.input.clear();
                                    app.update_users().await;
                                    app.input_mode = InputMode::Normal;
                                    app.incoming_alert = None;
                                } else {
                                    app.input.clear();
                                    app.incoming_alert = Some("Failed to connect to server".to_string());
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
                            // exit the program
                            break;
                        }
                        _ => {}
                    },
                    InputMode::EnterServerAddress => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                server_address = app.input.to_string();
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
                            // exit the program
                            break;
                        }
                        _ => {}
                    },
                    InputMode::CreatingGroup => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                app.create_group().await;
                                app.update_groups().await;
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
                        }
                        _ => {}
                    },
                    InputMode::AcceptingInvite => match key.code {
                        KeyCode::Char('y') => {
                            app.accept_invite().await;
                        }
                        KeyCode::Char('n') => {
                            app.decline_invite().await;
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.selected_invite = None;
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
