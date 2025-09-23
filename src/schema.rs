diesel::table! {
    episodes (id) {
        id -> Integer,
        timestamp -> Timestamp,
        duration_minutes -> Nullable<Integer>,
        severity -> Integer,
        triggers -> Nullable<Text>,
        symptoms -> Nullable<Text>,
        location -> Nullable<Text>,
        activities_before -> Nullable<Text>,
        medications_taken -> Nullable<Text>,
        notes -> Nullable<Text>,
        ai_analysis -> Nullable<Text>,
        created_at -> Timestamp,
    }
}