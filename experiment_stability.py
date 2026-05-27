import numpy as np

from extract_features import train_features, test_features


# -----------------------------------
# RAW SESSION SHIFT
# -----------------------------------

raw_shift = np.mean(
    np.abs(
        np.mean(test_features, axis=0)
        - np.mean(train_features, axis=0)
    )
)

print(f"RAW shift: {raw_shift:.4f}")


# -----------------------------------
# WHITENED SHIFT
# -----------------------------------

mu = np.mean(train_features, axis=0)

cov = np.cov(train_features, rowvar=False)

cov += 1e-6 * np.eye(cov.shape[0])

eigvals, eigvecs = np.linalg.eigh(cov)

W = eigvecs @ np.diag(1.0 / np.sqrt(eigvals)) @ eigvecs.T

X_test_white = (test_features - mu) @ W

white_shift = np.mean(
    np.abs(np.mean(X_test_white, axis=0))
)

print(f"WHITENED shift: {white_shift:.4f}")


# -----------------------------------
# MOVING AVG SHIFT
# -----------------------------------

alpha = 0.05

running_mean = np.mean(train_features, axis=0)

adapted = []

for x in test_features:

    x_aligned = x - running_mean

    adapted.append(x_aligned)

    running_mean = (
        (1 - alpha) * running_mean
        + alpha * x
    )

adapted = np.array(adapted)

adapt_shift = np.mean(
    np.abs(np.mean(adapted, axis=0))
)

print(f"MOVING AVG shift: {adapt_shift:.4f}")

