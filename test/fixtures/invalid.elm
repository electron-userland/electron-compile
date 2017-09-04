
main : Program Never Int Msg
main =
    Platform.program {
        init = (initialModel, Cmd.none),
        update = update,
        subscriptions = subscriptions
    }
