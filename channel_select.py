from build_subject_dataset import X_train

CHANNELS = [
    "Fz",
    "FC3", "FC1", "FCz", "FC2", "FC4",
    "C5", "C3", "C1", "Cz", "C2", "C4", "C6",
    "CP3", "CP1", "CPz", "CP2", "CP4",
    "P1", "Pz", "P2",
    "POz",
]

EMOTIV_LIKE = ["C3", "C4", "CP3", "CP4"]

ULTRA_LOW = ["C3", "C4"]


def select_channels(X, selected):

    indices = [CHANNELS.index(ch) for ch in selected]

    return X[:, :, indices]


X_small = select_channels(X_train, EMOTIV_LIKE)

print(X_small.shape)


