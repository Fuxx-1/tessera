#![forbid(unsafe_code)]

pub mod app;
pub mod component_catalog;
pub mod component_detail;
pub mod fixtures;
pub mod host;
pub mod lifecycle;
mod resources;
pub mod route;
pub mod state;

#[cfg(test)]
mod makepad_contract_tests;
