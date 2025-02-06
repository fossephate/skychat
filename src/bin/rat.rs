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
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame, Terminal,
};
use std::{
    error::Error,
    io,
    time::{Duration, Instant},
};
use tokio::sync::mpsc;

use skychat::convo::client::ConvoClient;

#[derive(PartialEq)]
enum InputMode {
    Normal,
    Username,
    Chatting,
    AcceptingInvite,
}

#[derive(PartialEq)]
enum TabMode {
    Chat,
    Invites,
}

struct App {
    input: String,
    input_mode: InputMode,
    users: Vec<User>,
    selected_user: Option<usize>,
    messages: Vec<String>,
    client: Option<ConvoClient>,
    current_group_id: Option<GroupId>,
    last_update: Instant,
}

type UserId = String;
type GroupId = Vec<u8>;

#[derive(Clone)]
struct User {
    name: String,
    user_id: String,
    key_package: Vec<u8>,
}

impl Default for App {
    fn default() -> App {
        App {
            input: String::new(),
            input_mode: InputMode::Username,
            users: Vec::new(),
            selected_user: None,
            messages: Vec::new(),
            client: None,
            current_group_id: None,
            last_update: Instant::now(),
        }
    }
}

impl App {
    async fn update_users(&mut self) {
        if let Some(client) = &mut self.client {
            let users_list = client.list_users().await;
            self.users = users_list
                .into_iter()
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
                let group_name = format!("group_{}", rand::thread_rng().gen_range(0..1000000));

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
                self.input_mode = InputMode::Chatting;
                self.messages
                    .push("Group created and invitation sent!".to_string());
            }
        }
    }

    async fn check_messages(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(group_id) = &self.current_group_id {
                client.check_incoming_messages(group_id.clone()).await;
                // client.display_group_messages(group_id.clone());
            }
        }
    }

    async fn send_message(&mut self) {
        if let Some(client) = &mut self.client {
            if let Some(group_id) = &self.current_group_id {
                if !self.input.is_empty() {
                    client
                        .send_message(group_id.clone(), self.input.clone())
                        .await;
                    self.input.clear();
                }
            }
        }
    }
}

fn ui<B: Backend>(f: &mut Frame<B>, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(3),
        ])
        .split(f.size());

    match app.input_mode {
        InputMode::Normal => {
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

            let users_list = List::new(users)
                .block(Block::default().title("Users").borders(Borders::ALL))
                .highlight_style(Style::default().add_modifier(Modifier::BOLD));

            f.render_widget(users_list, chunks[1]);
        }
        InputMode::Username => {
            let input = Paragraph::new(app.input.as_str()).block(
                Block::default()
                    .title("Enter username")
                    .borders(Borders::ALL),
            );
            f.render_widget(input, chunks[1]);
        }
        InputMode::Chatting => {
            let client = app.client.as_ref().unwrap();
            let group_id = app.current_group_id.as_ref().unwrap().clone();

            let message_strings = client.display_group_messages(group_id.clone());
            let messages: Vec<ListItem> = message_strings
                .iter()
                .map(|m| ListItem::new(m.clone()))
                .collect();

            let messages_list =
                List::new(messages).block(Block::default().title("Messages").borders(Borders::ALL));

            f.render_widget(messages_list, chunks[1]);
        }
    }

    let input = Paragraph::new(app.input.as_str())
        .block(Block::default().title("Input").borders(Borders::ALL));
    f.render_widget(input, chunks[2]);
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
  enable_raw_mode()?;
  let mut stdout = io::stdout();
  execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
  let backend = CrosstermBackend::new(stdout);
  let mut terminal = Terminal::new(backend)?;

  let mut app = App::default();
  let mut last_update = Instant::now();

    loop {
        // Update users list every 5 seconds
        if Instant::now().duration_since(last_update) >= Duration::from_secs(5) {
            app.update_users().await;
            last_update = Instant::now();
        }

        terminal.draw(|f| ui(f, &app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match app.input_mode {
                    InputMode::Normal => match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Up => {
                            if let Some(selected) = app.selected_user {
                                if selected > 0 {
                                    app.selected_user = Some(selected - 1);
                                }
                            } else {
                                app.selected_user = Some(0);
                            }
                        }
                        KeyCode::Down => {
                            if let Some(selected) = app.selected_user {
                                if selected < app.users.len().saturating_sub(1) {
                                    app.selected_user = Some(selected + 1);
                                }
                            } else {
                                app.selected_user = Some(0);
                            }
                        }
                        KeyCode::Enter => {
                            if app.selected_user.is_some() {
                                app.create_group().await;
                            }
                        }
                        _ => {}
                    },
                    InputMode::Username => match key.code {
                        KeyCode::Enter => {
                            if !app.input.is_empty() {
                                let mut client = ConvoClient::new(app.input.clone());
                                client
                                    .connect_to_server("http://127.0.0.1:8080".to_string())
                                    .await;
                                app.client = Some(client);
                                app.input.clear();
                                app.update_users().await;
                                app.input_mode = InputMode::Normal;
                            }
                        }
                        KeyCode::Char(c) => {
                            app.input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.input.pop();
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
                }
            }
        }

        if app.input_mode == InputMode::Chatting {
            app.check_messages().await;
        }
    }

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
